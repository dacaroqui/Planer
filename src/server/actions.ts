"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { signIn, signOut } from "@/auth"
import { DomainError, type TeamName } from "@/lib/domain"
import { assertAllowedFile } from "@/lib/files"
import { firstIssue, radicarSchema } from "@/lib/schemas"
import { guardarEmpresa, guardarProyecto, guardarTarea } from "@/server/proyectos"
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
  radicar,
  transicionar,
  trasladar,
  vigilarSlas,
} from "@/server/requests"

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

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
  const parsed = radicarSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    expectedResult: formData.get("expectedResult"),
    team: formData.get("team"),
    typeId: formData.get("typeId"),
    priority: formData.get("priority"),
    brand: formData.get("brand"),
    desiredDate: String(formData.get("desiredDate") || "") || undefined,
  })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const uploaded = formData.get("archivo")
  let file: { name: string; type: string; bytes: Buffer } | null = null
  if (uploaded instanceof File && uploaded.size > 0) {
    const bytes = Buffer.from(await uploaded.arrayBuffer())
    try {
      assertAllowedFile(uploaded.name, bytes.length)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Archivo inválido." }
    }
    file = { name: uploaded.name, type: uploaded.type, bytes }
  }

  let code = ""
  try {
    const request = await radicar(actor, {
      ...parsed.data,
      declares: true,
      reviewedPersonalData: parsed.data.reviewedPersonalData === "1",
      empresaId: String(formData.get("empresaId") || "") || undefined,
      projectId: String(formData.get("projectId") || "") || null,
    })
    code = request.code
    if (file) await adjuntar(actor, request.id, file)
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  redirect(`/requerimientos/${code}?confirmado=1`)
}

export async function transicionarAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireActor()
  const code = String(formData.get("code") || "")
  try {
    const { prisma } = await import("@/lib/prisma")
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) return { ok: false, error: "El requerimiento no existe." }
    await transicionar(
      actor,
      request.id,
      String(formData.get("name") || formData.get("to") || ""),
      String(formData.get("comment") || ""),
      { deliveryUrl: String(formData.get("deliveryUrl") || "") },
    )
  } catch (error) {
    return fallo(error)
  }
  refrescar(code)
  return { ok: true, message: "El estado quedó actualizado." }
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
    await guardarRoles(actor, String(formData.get("userId") || ""), {
      isAdmin: formData.get("isAdmin") === "1",
      active: formData.get("active") === "1",
      areaId: String(formData.get("areaId") || ""),
      memberships,
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
