"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { AuthError, CredentialsSignin } from "next-auth"
import { signIn, signOut } from "@/auth"
import { DomainError, type TeamName } from "@/lib/domain"
import { radicarDesdeFormulario } from "@/server/radicar-formulario"
import { guardarEmpresa, guardarProyecto, guardarTarea } from "@/server/proyectos"
import {
  aceptarInvitacion,
  aplicarRestablecimiento,
  crearInvitacion,
  crearUsuarioManual,
  generarRestablecimiento,
  registrarCuenta,
  solicitarRestablecimiento,
  sincronizarPerfil,
  type RolAsignable,
} from "@/server/cuentas"
import { requireActor } from "@/server/session"
import {
  actualizarTipo,
  adjuntar,
  asignar,
  comentar,
  crearArea,
  crearTipo,
  editarCampos,
  eliminarEstado,
  guardarEstado,
  guardarRoles,
  guardarSla,
  guardarTransicion,
  marcarAvisosLeidos,
  deshacerTransicion,
  transicionar,
  trasladar,
  vigilarSlas,
} from "@/server/requests"

export type ActionResult = { ok: true; message?: string; enlace?: string } | { ok: false; error: string }

function esRedireccion(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
}

function fallo(error: unknown): ActionResult {
  if (error instanceof DomainError) return { ok: false, error: error.message }
  console.error(error)
  return { ok: false, error: "No se pudo completar la acción." }
}

function refrescar(code?: string) {
  revalidatePath("/panel")
  revalidatePath("/requerimientos")
  revalidatePath("/bandeja")
  revalidatePath("/gerencia")
  revalidatePath("/notificaciones")
  revalidatePath("/admin/usuarios")
  revalidatePath("/admin/catalogos")
  if (code) revalidatePath(`/requerimientos/${code}`)
}

function equiposDe(formData: FormData) {
  const teams: Array<"DESARROLLO" | "MARKETING"> = []
  if (formData.get("team:DESARROLLO") === "1") teams.push("DESARROLLO")
  if (formData.get("team:MARKETING") === "1") teams.push("MARKETING")
  return teams
}

function rolDe(value: string): RolAsignable | null {
  if (value === "SOLICITANTE" || value === "AGENTE" || value === "LIDER" || value === "OBSERVADOR" || value === "ADMINISTRADOR") return value
  return null
}

function lista(formData: FormData, key: string) {
  return formData.getAll(key).map((item) => String(item)).filter(Boolean)
}

export async function entrarConClave(formData: FormData) {
  try {
    await signIn("credenciales", {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      redirectTo: "/panel",
    })
  } catch (error) {
    if (esRedireccion(error)) throw error
    if (error instanceof CredentialsSignin) {
      redirect(`/login?code=${error.code}`)
    }
    if (error instanceof AuthError) {
      redirect("/login?code=credenciales")
    }
    throw error
  }
}

export async function aceptarInvitacionAction(formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") || "")
  const password = String(formData.get("password") || "")
  if (password !== String(formData.get("confirm") || "")) return { ok: false, error: "Las contraseñas no coinciden." }
  try {
    const user = await aceptarInvitacion(token, String(formData.get("name") || ""), password)
    await signIn("credenciales", { email: user.email, password, redirectTo: "/panel" })
  } catch (error) {
    if (esRedireccion(error)) throw error
    if (error instanceof CredentialsSignin || error instanceof AuthError) {
      return { ok: true, message: "Cuenta lista. Ingrese con su correo y contraseña." }
    }
    return fallo(error)
  }
  return { ok: true }
}

export async function restablecerClaveAction(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") || "")
  if (password !== String(formData.get("confirm") || "")) return { ok: false, error: "Las contraseñas no coinciden." }
  try {
    await aplicarRestablecimiento(String(formData.get("token") || ""), password)
  } catch (error) {
    return fallo(error)
  }
  redirect("/login?code=restablecida")
}

export async function solicitarRestablecimientoAction(formData: FormData) {
  try {
    await solicitarRestablecimiento(String(formData.get("email") || ""))
  } catch {
    redirect("/login?code=smtp")
  }
  redirect("/login?code=enviado")
}

export async function registrarCuentaAction(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") || "")
  if (password !== String(formData.get("confirm") || "")) return { ok: false, error: "Las contraseñas no coinciden." }
  try {
    await registrarCuenta({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password,
    })
  } catch (error) {
    return fallo(error)
  }
  return { ok: true, message: "Quedó pendiente de aprobación. Un administrador debe activar la cuenta." }
}

export async function crearInvitacionAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const rol = rolDe(String(formData.get("rol") || ""))
  if (!rol) return { ok: false, error: "Elija el rol." }
  try {
    const result = await crearInvitacion(actor, {
      email: String(formData.get("email") || ""),
      rol,
      areaId: String(formData.get("areaId") || ""),
      areaIds: lista(formData, "areaIds"),
      empresaIds: lista(formData, "empresaIds"),
      teams: equiposDe(formData),
    })
    return {
      ok: true,
      enlace: result.enlace,
      message: result.enviado ? "Invitación creada y enviada por correo. También puede copiar el enlace." : "Invitación creada. Copie el enlace: no hay correo configurado.",
    }
  } catch (error) {
    return fallo(error)
  }
}

export async function crearUsuarioManualAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const rol = rolDe(String(formData.get("rol") || ""))
  if (!rol) return { ok: false, error: "Elija el rol." }
  try {
    await crearUsuarioManual(actor, {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      rol,
      areaId: String(formData.get("areaId") || ""),
      areaIds: lista(formData, "areaIds"),
      empresaIds: lista(formData, "empresaIds"),
      teams: equiposDe(formData),
      active: formData.get("active") !== "0",
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Usuario creado." }
}

export async function generarRestablecimientoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    const result = await generarRestablecimiento(actor, String(formData.get("userId") || ""))
    return {
      ok: true,
      enlace: result.enlace,
      message: result.enviado ? "Enlace creado y enviado por correo." : "Enlace creado. Cópielo: no hay correo configurado.",
    }
  } catch (error) {
    return fallo(error)
  }
}

export async function sincronizarPerfilAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await sincronizarPerfil(actor, String(formData.get("userId") || ""), {
      empresaIds: lista(formData, "empresaIds"),
      areaIds: lista(formData, "areaIds"),
      pendiente: formData.get("pendiente") === "1",
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: formData.get("pendiente") === "1" ? "La cuenta quedó pendiente." : "Cuenta actualizada." }
}

export async function entrarComo(formData: FormData) {
  if (process.env.DEV_AUTH_ENABLED !== "true") {
    redirect("/login?error=Configuration")
  }
  await signIn("dev", { email: String(formData.get("email") || ""), redirectTo: "/panel" })
}

export async function entrarConMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/panel" })
}

export async function salir() {
  await signOut({ redirectTo: "/login" })
}

export async function radicarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const result = await radicarDesdeFormulario(actor, formData)
  if (!result.ok) return result
  refrescar(result.code)
  redirect(`/requerimientos/${result.code}?confirmado=1`)
}

export async function transicionarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) return { ok: false, error: "El requerimiento no existe." }
    const updated = await transicionar(
      actor,
      request.id,
      String(formData.get("name") || formData.get("to") || ""),
      String(formData.get("comment") || ""),
      { deliveryUrl: String(formData.get("deliveryUrl") || "") },
    )
    refrescar(code)
    const { statusLabel } = await import("@/lib/domain")
    return { ok: true, message: `${code} pasó a ${statusLabel(updated.status)}.` }
  } catch (error) {
    return fallo(error)
  }
}

export async function deshacerTransicionAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) return { ok: false, error: "El requerimiento no existe." }
    await deshacerTransicion(actor, request.id)
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: `Se deshizo el cambio de ${code}.` }
}

export async function comentarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) return { ok: false, error: "El requerimiento no existe." }
    await comentar(actor, request.id, String(formData.get("body") || ""), formData.get("interna") === "1")
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "Comentario publicado." }
}

export async function asignarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) return { ok: false, error: "El requerimiento no existe." }
    await asignar(actor, request.id, String(formData.get("assigneeId") || ""))
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "Asignación actualizada." }
}

export async function adjuntarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  const uploaded = formData.get("archivo")
  if (!(uploaded instanceof File) || uploaded.size <= 0) {
    return { ok: false, error: "Elija un archivo." }
  }
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) return { ok: false, error: "El requerimiento no existe." }
    await adjuntar(actor, request.id, {
      name: uploaded.name,
      type: uploaded.type,
      bytes: Buffer.from(await uploaded.arrayBuffer()),
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "Archivo adjuntado." }
}

export async function marcarAvisosAction() {
  const actor = await requireActor()
  await marcarAvisosLeidos(actor)
  refrescar()
}

export async function vigilarSlasAction(): Promise<ActionResult> {
  const actor = await requireActor()
  if (actor.role !== "ADMINISTRADOR") return { ok: false, error: "Solo el administrador dispara la revisión de SLA." }
  try {
    const result = await vigilarSlas()
    refrescar()
    return { ok: true, message: `Se revisaron ${result.revisados} requerimientos y se enviaron ${result.enviados} avisos.` }
  } catch (error) {
    return fallo(error)
  }
}

export async function actualizarUsuarioAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const memberships: { team: TeamName; role: "AGENTE" | "LIDER" | "OBSERVADOR" }[] = []
  for (const team of ["DESARROLLO", "MARKETING"] as const) {
    for (const role of ["AGENTE", "LIDER", "OBSERVADOR"] as const) {
      if (formData.get(`${role}:${team}`) === "1") memberships.push({ team, role })
    }
  }
  try {
    const userId = String(formData.get("userId") || "")
    await guardarRoles(actor, userId, {
      isAdmin: formData.get("isAdmin") === "1",
      active: formData.get("active") === "1",
      areaId: String(formData.get("areaId") || ""),
      memberships,
    })
    await sincronizarPerfil(actor, userId, {
      empresaIds: lista(formData, "empresaIds"),
      areaIds: lista(formData, "areaIds"),
      pendiente: formData.get("pendiente") === "1",
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Roles actualizados. El cambio quedó en la auditoría." }
}

export async function crearAreaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await crearArea(actor, String(formData.get("name") || ""))
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Área creada." }
}

export async function crearTipoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const team = String(formData.get("team") || "")
  if (team !== "DESARROLLO" && team !== "MARKETING") return { ok: false, error: "Elija el equipo." }
  try {
    await crearTipo(actor, {
      team,
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      extra: String(formData.get("extra") || ""),
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Tipo creado." }
}

export async function actualizarTipoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await actualizarTipo(actor, String(formData.get("id") || ""), {
      description: String(formData.get("description") || ""),
      extra: String(formData.get("extra") || ""),
      active: formData.get("active") === "1",
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Tipo actualizado." }
}

function exigir(error: unknown): never {
  if (error instanceof DomainError) throw new Error(error.message)
  throw error
}

export async function editarCamposAction(formData: FormData) {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) throw new Error("El requerimiento no existe.")
    await editarCampos(actor, request.id, {
      priority: String(formData.get("priority") || "") || undefined,
      brand: String(formData.get("brand") || "") || undefined,
      typeId: String(formData.get("typeId") || "") || undefined,
      committedDate: String(formData.get("committedDate") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
    })
  } catch (error) {
    exigir(error)
  }
  refrescar(code)
}

export async function trasladarAction(formData: FormData) {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  const team = String(formData.get("team") || "")
  if (team !== "DESARROLLO" && team !== "MARKETING") throw new Error("Elija el área.")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) throw new Error("El requerimiento no existe.")
    await trasladar(actor, request.id, team)
  } catch (error) {
    exigir(error)
  }
  refrescar(code)
}

export async function guardarEstadoAction(formData: FormData) {
  const actor = await requireActor()
  const team = String(formData.get("team") || "")
  if (team !== "DESARROLLO" && team !== "MARKETING") throw new Error("Elija el área.")
  try {
    await guardarEstado(actor, {
      id: String(formData.get("id") || "") || undefined,
      team,
      key: String(formData.get("key") || ""),
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "EN_CURSO"),
      boardColumn: String(formData.get("boardColumn") || ""),
    })
  } catch (error) {
    exigir(error)
  }
  refrescar()
}

export async function eliminarEstadoAction(formData: FormData) {
  const actor = await requireActor()
  try {
    await eliminarEstado(actor, String(formData.get("id") || ""), String(formData.get("moveTo") || "") || undefined)
  } catch (error) {
    exigir(error)
  }
  refrescar()
}

export async function guardarTransicionAction(formData: FormData) {
  const actor = await requireActor()
  const team = String(formData.get("team") || "")
  if (team !== "DESARROLLO" && team !== "MARKETING") throw new Error("Elija el área.")
  try {
    await guardarTransicion(actor, {
      id: String(formData.get("id") || "") || undefined,
      team,
      name: String(formData.get("name") || ""),
      fromKeys: String(formData.get("fromKeys") || ""),
      toKey: String(formData.get("toKey") || ""),
      allowedRoles: String(formData.get("allowedRoles") || "LIDER"),
      requiresComment: formData.get("requiresComment") === "1",
      requiresAssignee: formData.get("requiresAssignee") === "1",
      requiresCommittedDate: formData.get("requiresCommittedDate") === "1",
      requiresDelivery: formData.get("requiresDelivery") === "1",
      slaEffect: String(formData.get("slaEffect") || "NONE"),
    })
  } catch (error) {
    exigir(error)
  }
  refrescar()
}

export async function guardarSlaAction(formData: FormData) {
  const actor = await requireActor()
  const team = String(formData.get("team") || "")
  if (team !== "DESARROLLO" && team !== "MARKETING") throw new Error("Elija el área.")
  try {
    await guardarSla(actor, {
      id: String(formData.get("id") || "") || undefined,
      team,
      priority: String(formData.get("priority") || "MEDIA"),
      typeId: String(formData.get("typeId") || "") || null,
      firstResponseMinutes: Number(formData.get("firstHours") || 0) * 60,
      resolutionMinutes: Number(formData.get("resolutionHours") || 0) * 60,
    })
  } catch (error) {
    exigir(error)
  }
  refrescar()
}

export async function guardarTareaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const status = String(formData.get("status") || "PENDIENTE")
  if (status !== "PENDIENTE" && status !== "EN_CURSO" && status !== "HECHA") {
    return { ok: false, error: "Estado de tarea no válido." }
  }
  try {
    const opcional = (key: string) => (formData.has(key) ? String(formData.get(key) || "") || null : undefined)
    await guardarTarea(actor, {
      id: String(formData.get("id") || "") || undefined,
      title: String(formData.get("title") || ""),
      assigneeId: opcional("assigneeId"),
      dueDate: opcional("dueDate"),
      status,
      requestId: opcional("requestId"),
      projectId: opcional("projectId"),
      parentId: opcional("parentId"),
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  revalidatePath("/proyectos")
  revalidatePath("/planner")
  return { ok: true, message: status === "HECHA" ? "Tarea hecha. El avance se actualizó." : "Tarea guardada." }
}

export async function guardarProyectoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const status = String(formData.get("status") || "PLANIFICADO")
  if (status !== "PLANIFICADO" && status !== "EN_CURSO" && status !== "EN_PAUSA" && status !== "CERRADO") {
    return { ok: false, error: "Estado de proyecto no válido." }
  }
  try {
    await guardarProyecto(actor, {
      id: String(formData.get("id") || "") || undefined,
      empresaId: String(formData.get("empresaId") || ""),
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      leaderId: String(formData.get("leaderId") || ""),
      startsAt: String(formData.get("startsAt") || ""),
      targetAt: String(formData.get("targetAt") || ""),
      status,
    })
  } catch (error) {
    return fallo(error)
  }
  revalidatePath("/proyectos")
  return { ok: true, message: "Proyecto guardado." }
}

export async function guardarEmpresaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await guardarEmpresa(actor, {
      id: String(formData.get("id") || "") || undefined,
      name: String(formData.get("name") || ""),
      active: formData.get("active") !== "0",
      exigirProyectoAlClasificar: formData.get("exigir") === "1",
    })
  } catch (error) {
    return fallo(error)
  }
  revalidatePath("/proyectos")
  return { ok: true, message: "Empresa guardada." }
}
