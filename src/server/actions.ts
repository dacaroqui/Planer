"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { AuthError, CredentialsSignin } from "next-auth"
import { signIn, signOut } from "@/auth"
import { DomainError, PermisoDenegado, TEAMS, esTeam, type TeamName } from "@/lib/domain"
import { radicarDesdeFormulario } from "@/server/radicar-formulario"
import { crearProyectoAlRadicar, eliminarTarea, guardarEmpresa, guardarProyecto, guardarTarea } from "@/server/proyectos"
import { desactivarPersona, reactivarPersona } from "@/server/personas-baja"
import { aplicarPlantillaEstandar, definirLiderArea, guardarPresentacionEquipo } from "@/server/equipos-admin"
import { rechazoEliminar } from "@/server/eliminar"
import {
  aceptarInvitacion,
  actualizarPerfil,
  aplicarRestablecimiento,
  cambiarClavePropia,
  crearInvitacion,
  crearUsuarioManual,
  generarRestablecimiento,
  registrarCuenta,
  revocarInvitacion,
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
  cambiarPrioridadMasiva,
  transicionarMasiva,
  asignarMasiva,
  editarCampos,
  eliminarEstado,
  eliminarRequerimiento,
  eliminarRequerimientos,
  guardarEstado,
  guardarRoles,
  guardarSla,
  guardarTransicion,
  marcarAvisoLeido,
  marcarAvisosLeidos,
  deshacerTransicion,
  transicionar,
  guardarFechaEntrega,
  trasladar,
  vigilarSlas,
} from "@/server/requests"

export type ActionResult = { ok: true; message?: string; enlace?: string; resumen?: string; code?: string; id?: string } | { ok: false; error: string; status?: number }

function esRedireccion(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
}

function fallo(error: unknown): ActionResult {
  if (error instanceof PermisoDenegado) return { ok: false, error: error.message, status: 403 }
  if (error instanceof DomainError) return { ok: false, error: error.message }
  console.error(error)
  return { ok: false, error: "No se pudo completar la acción." }
}

function refrescar(code?: string) {
  revalidatePath("/panel")
  revalidatePath("/requerimientos")
  revalidatePath("/planner")
  revalidatePath("/proyectos")
  revalidatePath("/bandeja")
  revalidatePath("/gerencia")
  revalidatePath("/notificaciones")
  revalidatePath("/admin/usuarios")
  revalidatePath("/admin/catalogos")
  if (code) revalidatePath(`/requerimientos/${code}`)
}

function equiposDe(formData: FormData) {
  const teams: TeamName[] = []
  for (const team of TEAMS) {
    if (formData.get(`team:${team}`) === "1") teams.push(team)
  }
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
    await aceptarInvitacion(token, String(formData.get("name") || ""), password, {
      cargo: String(formData.get("cargo") || ""),
      avatar: String(formData.get("avatar") || ""),
      aceptaPolitica: String(formData.get("politica") || "") === "1",
    })
  } catch (error) {
    if (esRedireccion(error)) throw error
    if (error instanceof CredentialsSignin || error instanceof AuthError) {
      return { ok: true, message: "Cuenta lista. Ingrese con su correo y contraseña." }
    }
    return fallo(error)
  }
  return { ok: true }
}

export async function actualizarPerfilAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await actualizarPerfil(actor, {
      name: String(formData.get("name") || ""),
      cargo: String(formData.get("cargo") || ""),
      avatar: String(formData.get("avatar") || ""),
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Perfil actualizado." }
}

export async function cambiarClavePropiaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const nueva = String(formData.get("password") || "")
  if (nueva !== String(formData.get("confirm") || "")) return { ok: false, error: "Las contraseñas no coinciden." }
  try {
    await cambiarClavePropia(actor, String(formData.get("actual") || ""), nueva)
  } catch (error) {
    return fallo(error)
  }
  return { ok: true, message: "Contraseña actualizada." }
}

export async function revocarInvitacionFormAction(formData: FormData): Promise<void> {
  await revocarInvitacionAction(formData)
}

export async function revocarInvitacionAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await revocarInvitacion(actor, String(formData.get("id") || ""))
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Invitación revocada." }
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
      resumen: result.resumen,
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
  return { ok: true, code: result.code, message: `Radicado ${result.code}.` }
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
      {
        deliveryUrl: String(formData.get("deliveryUrl") || ""),
        projectId: String(formData.get("projectId") || "") || null,
        assigneeId: String(formData.get("assigneeId") || "") || null,
        committedDate: String(formData.get("committedDate") || "") || null,
        resolution: String(formData.get("resolution") || "") || null,
        visibilidad: formData.get("visibilidad") === "publica" ? "publica" : formData.get("visibilidad") === "interna" ? "interna" : undefined,
        resolutionNote: formData.has("resolutionNote") ? String(formData.get("resolutionNote") || "") : undefined,
      },
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
    const kindRaw = String(formData.get("kind") || "")
    if (kindRaw === "PUBLICA" || kindRaw === "INTERNA" || kindRaw === "REGISTRO" || kindRaw === "SOLICITUD_INFO") {
      const { registrarEntrada, adjuntar: guardarAdjunto } = await import("@/server/requests")
      const entrada = await registrarEntrada(actor, request.id, {
        kind: kindRaw,
        body: String(formData.get("body") || ""),
        minutes: Number(formData.get("minutes") || 0),
        tareaId: String(formData.get("tareaId") || "") || null,
        compartir: formData.get("compartir") === "1",
      })
      for (const archivo of formData.getAll("archivo")) {
        if (!(archivo instanceof File) || archivo.size <= 0) continue
        await guardarAdjunto(actor, request.id, {
          name: archivo.name,
          type: archivo.type,
          bytes: Buffer.from(await archivo.arrayBuffer()),
        }, { commentId: entrada.id })
      }
    } else {
      await comentar(actor, request.id, String(formData.get("body") || ""), formData.get("interna") === "1")
    }
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "Comentario publicado." }
}

export async function crearProyectoRadicarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const team = String(formData.get("team") || "")
  if (!esTeam(team)) return { ok: false, error: "Elija el equipo del proyecto." }
  try {
    const proyecto = await crearProyectoAlRadicar(actor, {
      empresaId: String(formData.get("empresaId") || ""),
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      team,
    })
    refrescar()
    return { ok: true, id: proyecto.id, resumen: proyecto.name, message: "Proyecto creado." }
  } catch (error) {
    return fallo(error)
  }
}

export async function guardarFechaEntregaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    await guardarFechaEntrega(actor, code, String(formData.get("desiredDate") || ""))
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "Fecha de entrega esperada guardada." }
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

export async function marcarAvisoAction(formData: FormData) {
  const actor = await requireActor()
  await marcarAvisoLeido(actor, String(formData.get("id") || ""))
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
  for (const team of TEAMS) {
    const elegido = String(formData.get(`rol:${team}`) || "")
    if (elegido === "AGENTE" || elegido === "LIDER" || elegido === "OBSERVADOR") {
      memberships.push({ team, role: elegido })
      continue
    }
    if (formData.has(`rol:${team}`)) continue
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

export async function guardarPresentacionAreaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await guardarPresentacionEquipo(actor, {
      team: String(formData.get("team") || ""),
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      icon: String(formData.get("icon") || ""),
      color: String(formData.get("color") || ""),
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Área actualizada. El cambio quedó en la auditoría." }
}

export async function definirLiderAreaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await definirLiderArea(actor, {
      userId: String(formData.get("userId") || ""),
      team: String(formData.get("team") || ""),
      activo: formData.get("activo") === "1",
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Líderes actualizados." }
}

export async function aplicarPlantillaAreaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    const result = await aplicarPlantillaEstandar(actor, String(formData.get("team") || ""))
    refrescar()
    return { ok: true, message: result.agregados ? `Se agregaron ${result.agregados} estados de la plantilla.` : "La plantilla ya estaba completa." }
  } catch (error) {
    return fallo(error)
  }
}

export async function desactivarPersonaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await desactivarPersona(actor, String(formData.get("userId") || ""), String(formData.get("reasignarA") || "") || null)
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Persona desactivada. Ya no puede entrar y queda fuera de las listas de asignación." }
}

export async function reactivarPersonaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await reactivarPersona(actor, String(formData.get("userId") || ""))
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Persona reactivada." }
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
  if (!esTeam(team)) return { ok: false, error: "Elija el equipo." }
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

export async function prioridadMasivaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const codes = String(formData.get("codes") || "").split(",").map((item) => item.trim()).filter(Boolean)
  try {
    const total = await cambiarPrioridadMasiva(actor, codes, String(formData.get("priority") || ""))
    refrescar()
    return { ok: true, message: `Prioridad actualizada en ${total} requerimientos.` }
  } catch (error) {
    return fallo(error)
  }
}

function codesDe(formData: FormData) {
  return String(formData.get("codes") || "").split(",").map((item) => item.trim()).filter(Boolean)
}

export async function estadoMasivaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    const total = await transicionarMasiva(actor, codesDe(formData), String(formData.get("status") || formData.get("name") || ""))
    refrescar()
    if (!total) return { ok: false, error: "No se pudo cambiar el estado de los seleccionados. Revise transiciones y campos requeridos." }
    return { ok: true, message: `Estado actualizado en ${total} requerimientos.` }
  } catch (error) {
    return fallo(error)
  }
}

export async function asignarMasivaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    const resultado = await asignarMasiva(actor, codesDe(formData), String(formData.get("assigneeId") || ""))
    refrescar()
    const detalle = resultado.errores.map((item) => `${item.code}: ${item.mensaje}`).join(" ")
    if (!resultado.hechos) return { ok: false, error: detalle || "No se pudo asignar el responsable de los seleccionados." }
    if (detalle) return { ok: true, message: `Responsable asignado en ${resultado.hechos}. ${detalle}` }
    return { ok: true, message: `Responsable asignado en ${resultado.hechos} requerimientos.` }
  } catch (error) {
    return fallo(error)
  }
}

export async function editarCamposAction(formData: FormData): Promise<ActionResult> {
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
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "Clasificación guardada." }
}

export async function trasladarAction(formData: FormData) {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  const team = String(formData.get("team") || "")
  if (!esTeam(team)) throw new Error("Elija el área.")
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
  if (!esTeam(team)) throw new Error("Elija el área.")
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

export async function eliminarEstadoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  try {
    await eliminarEstado(actor, String(formData.get("id") || ""), String(formData.get("moveTo") || "") || undefined)
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Estado eliminado." }
}

export async function guardarTransicionAction(formData: FormData) {
  const actor = await requireActor()
  const team = String(formData.get("team") || "")
  if (!esTeam(team)) throw new Error("Elija el área.")
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
  if (!esTeam(team)) throw new Error("Elija el área.")
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
      horasEstimadas: formData.has("horasEstimadas") ? String(formData.get("horasEstimadas") || "") : undefined,
      horasReales: formData.has("horasReales") ? String(formData.get("horasReales") || "") : undefined,
      fechaInicio: opcional("fechaInicio"),
      kpiNombre: opcional("kpiNombre"),
      kpiMeta: opcional("kpiMeta"),
      kpiUnidad: opcional("kpiUnidad"),
      kpiActual: opcional("kpiActual"),
    })
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  revalidatePath("/proyectos")
  revalidatePath("/planner")
  const esSubtarea = Boolean(formData.get("parentId"))
  const mensaje = esSubtarea
    ? (status === "HECHA" ? "Subtarea marcada como hecha." : "Subtarea guardada.")
    : (status === "HECHA" ? "Tarea hecha. El avance se actualizó." : "Tarea guardada.")
  return { ok: true, message: mensaje }
}

export async function guardarProyectoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const status = String(formData.get("status") || "PLANIFICADO")
  if (status !== "PLANIFICADO" && status !== "EN_CURSO" && status !== "EN_PAUSA" && status !== "CERRADO") {
    return { ok: false, error: "Estado de proyecto no válido." }
  }
  const equipo = String(formData.get("team") || "")
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
      ...(formData.has("objetivoId") ? { objetivoId: String(formData.get("objetivoId") || "") || null } : {}),
      ...(formData.has("medio") ? { medio: String(formData.get("medio") || "") } : {}),
      ...(formData.has("fase") ? { fase: String(formData.get("fase") || "") } : {}),
      ...(formData.has("costo") ? { costo: String(formData.get("costo") || "") } : {}),
      ...(formData.has("team") && esTeam(equipo) ? { team: equipo } : {}),
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

export async function eliminarTareaAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const rechazo = rechazoEliminar(actor)
  if (rechazo) return rechazo
  try {
    await eliminarTarea(actor, String(formData.get("id") || ""))
  } catch (error) {
    return fallo(error)
  }
  refrescar()
  return { ok: true, message: "Tarea eliminada." }
}

export async function eliminarRequerimientoAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const rechazo = rechazoEliminar(actor)
  if (rechazo) return rechazo
  const code = String(formData.get("code") || "")
  try {
    await eliminarRequerimiento(actor, code)
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: `Se eliminó ${code}.` }
}

export async function eliminarRequerimientosAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const rechazo = rechazoEliminar(actor)
  if (rechazo) return rechazo
  try {
    const total = await eliminarRequerimientos(actor, codesDe(formData))
    refrescar()
    return { ok: true, message: `Se eliminaron ${total} requerimientos.` }
  } catch (error) {
    return fallo(error)
  }
}
