import { appBaseUrl, createEmailProvider } from "@/lib/email"
import { correoAsignacionHabilitado } from "@/lib/correo-asignacion"
import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado, esTeam, type Actor, type TeamName } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"
import {
  presentarTarea,
  puedeEditarPlan,
  puedeRegistrarAvance,
  transicionTareaValida,
  type EstadoTareaPlan,
  type FilaPlan,
} from "@/lib/plan-trabajo"
import { guardarProyecto, guardarTarea, listarProyectos } from "@/server/proyectos"

export async function listarPlan(actor: Actor): Promise<FilaPlan[]> {
  const proyectos = await listarProyectos(actor)
  if (proyectos.length === 0) return []
  const tareas = await prisma.tarea.findMany({
    where: {
      parentId: null,
      OR: [
        { projectId: { in: proyectos.map((proyecto) => proyecto.id) } },
        { assigneeId: actor.id, projectId: { not: null } },
      ],
    },
    include: { assignee: { select: { id: true, name: true } }, project: true },
    orderBy: [{ project: { name: "asc" } }, { createdAt: "asc" }],
  })
  return tareas.flatMap((tarea) => {
    if (!tarea.project) return []
    return [presentarTarea({
      id: tarea.id,
      title: tarea.title,
      participantes: tarea.participantes,
      bloqueo: tarea.bloqueo,
      notaRol: tarea.notaRol,
      status: tarea.status,
      dueDate: tarea.dueDate,
      fechaInicio: tarea.fechaInicio,
      assigneeId: tarea.assigneeId,
      assigneeName: tarea.assignee?.name ?? null,
      proyectoId: tarea.project.id,
      proyecto: tarea.project.name,
      team: tarea.project.team,
      description: tarea.project.description,
      startsAt: tarea.project.startsAt,
      targetAt: tarea.project.targetAt,
      horasEstimadas: tarea.horasEstimadas,
      horasReales: tarea.horasReales,
      kpiNombre: tarea.kpiNombre,
      kpiMeta: tarea.kpiMeta,
      kpiUnidad: tarea.kpiUnidad,
      kpiActual: tarea.kpiActual,
      puedeEditar: puedeEditarPlan(actor, tarea.project.team),
      puedeRegistrar: puedeRegistrarAvance(actor.id, tarea.assigneeId, puedeEditarPlan(actor, tarea.project.team)),
    })]
  })
}

async function proyectoVisible(actor: Actor, proyectoId: string) {
  const visibles = await listarProyectos(actor)
  const proyecto = visibles.find((item) => item.id === proyectoId)
  if (proyecto) return proyecto
  const propia = await prisma.tarea.findFirst({ where: { projectId: proyectoId, assigneeId: actor.id }, include: { project: true } })
  if (!propia?.project) throw new PermisoDenegado("No puede ver este proyecto.")
  return propia.project
}

async function avisar(userIds: string[], frase: string, href: string) {
  const destino = await prisma.user.findMany({
    where: { id: { in: userIds }, active: true, deactivatedAt: null },
    select: { id: true, name: true, email: true },
  })
  const correo = correoAsignacionHabilitado()
  for (const persona of destino) {
    const texto = `${persona.name}, ${frase}`
    await prisma.notification.create({
      data: { userId: persona.id, subject: texto, body: texto, href, dedupeKey: `plan-${persona.id}-${Date.now()}` },
    })
    if (!correo) continue
    try {
      await createEmailProvider().send({ to: persona.email, subject: texto, text: `${texto}\n${appBaseUrl()}${href}` })
    } catch (error) {
      console.error("[correo] No se pudo enviar", persona.email, error)
    }
  }
}

export async function crearActividadPlan(actor: Actor, input: {
  proyectoId: string
  titulo: string
  assigneeId?: string | null
  participantes?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
  horasEstimadas?: string | null
  kpiNombre?: string | null
  kpiMeta?: string | null
  kpiUnidad?: string | null
  kpiActual?: string | null
  bloqueo?: string | null
}) {
  const proyecto = await proyectoVisible(actor, input.proyectoId)
  const asigna = puedeEditarPlan(actor, proyecto.team)
  const responsable = asigna ? (input.assigneeId || null) : null
  const tarea = await guardarTarea(actor, {
    title: input.titulo,
    status: "PENDIENTE",
    assigneeId: responsable,
    projectId: proyecto.id,
    dueDate: input.fechaFin,
    fechaInicio: input.fechaInicio,
    horasEstimadas: input.horasEstimadas,
    participantes: input.participantes,
    bloqueo: input.bloqueo,
    kpiNombre: input.kpiNombre,
    kpiMeta: input.kpiMeta,
    kpiUnidad: input.kpiUnidad,
    kpiActual: input.kpiActual,
    desdePlan: true,
  })
  if (!asigna && proyecto.team) {
    const lideres = await prisma.areaRole.findMany({
      where: { team: proyecto.team, role: "LIDER", user: { active: true, deactivatedAt: null } },
      select: { userId: true },
    })
    const ids = lideres.map((item) => item.userId).filter((id) => id !== actor.id)
    if (ids.length) await avisar(ids, `${actor.name} agregó «${input.titulo.trim()}» en ${proyecto.name} sin responsable.`, `/plan`)
  }
  return tarea
}

export async function crearProyectoPlan(actor: Actor, input: { name: string; team: string; startsAt: string; targetAt: string; empresaId: string }) {
  if (!esAdmin(actor)) throw new PermisoDenegado("Solo un administrador crea proyectos desde el plan.")
  if (!esTeam(input.team)) throw new DomainError("Elija el área.")
  return guardarProyecto(actor, {
    empresaId: input.empresaId,
    name: input.name,
    description: "",
    leaderId: actor.id,
    startsAt: input.startsAt,
    targetAt: input.targetAt,
    status: "EN_CURSO",
    team: input.team,
  })
}

export async function responsablesDeArea(team: TeamName | null) {
  return prisma.user.findMany({
    where: {
      active: true,
      deactivatedAt: null,
      ...(team
        ? { areaRoles: { some: { team, role: { in: ["AGENTE", "LIDER"] } } } }
        : { OR: [{ role: "ADMINISTRADOR" }, { areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } }] }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, areaRoles: { select: { team: true } } },
  })
}

export async function editarFilaPlan(
  actor: Actor,
  input: {
    id: string
    status?: EstadoTareaPlan
    assigneeId?: string | null
    bloqueo?: string | null
    participantes?: string | null
    fechaInicio?: string | null
    fechaFin?: string | null
    horasEstimadas?: string | null
    horasReales?: string | null
    kpiNombre?: string | null
    kpiMeta?: string | null
    kpiUnidad?: string | null
    kpiActual?: string | null
    soloAvance?: boolean
  },
) {
  const tarea = await prisma.tarea.findUnique({
    where: { id: input.id },
    include: { project: true },
  })
  if (!tarea?.projectId || !tarea.project) throw new DomainError("La tarea no está en un proyecto del plan.")
  await proyectoVisible(actor, tarea.projectId)
  const edita = puedeEditarPlan(actor, tarea.project.team)
  const registra = puedeRegistrarAvance(actor.id, tarea.assigneeId, edita)
  if (!edita) {
    if (!registra) throw new PermisoDenegado("Solo el líder del área o un administrador edita el plan.")
    const pideMas = input.status || input.assigneeId !== undefined || input.bloqueo !== undefined || input.participantes !== undefined || input.fechaInicio !== undefined || input.fechaFin !== undefined || input.horasEstimadas !== undefined || input.kpiNombre !== undefined || input.kpiMeta !== undefined || input.kpiUnidad !== undefined
    if (pideMas) throw new PermisoDenegado("Solo el responsable registra horas reales y el valor actual del KPI.")
    await prisma.tarea.update({
      where: { id: tarea.id },
      data: {
        ...(input.horasReales !== undefined ? { horasReales: input.horasReales?.trim() ? Number(input.horasReales) : null } : {}),
        ...(input.kpiActual !== undefined ? { kpiActual: input.kpiActual?.trim() ? Number(input.kpiActual) : null } : {}),
      },
    })
    return
  }
  if (input.status && !transicionTareaValida(tarea.status, input.status)) {
    throw new DomainError("Ese cambio de estado no está permitido. Pase por En curso.")
  }
  await guardarTarea(actor, {
    id: tarea.id,
    title: tarea.title,
    status: input.status ?? tarea.status,
    assigneeId: input.assigneeId !== undefined ? input.assigneeId : tarea.assigneeId,
    projectId: tarea.projectId,
    requestId: tarea.requestId,
    ...(input.fechaFin !== undefined ? { dueDate: input.fechaFin } : {}),
    ...(input.fechaInicio !== undefined ? { fechaInicio: input.fechaInicio } : {}),
    ...(input.horasEstimadas !== undefined ? { horasEstimadas: input.horasEstimadas } : {}),
    ...(input.horasReales !== undefined ? { horasReales: input.horasReales } : {}),
    ...(input.participantes !== undefined ? { participantes: input.participantes } : {}),
    ...(input.bloqueo !== undefined ? { bloqueo: input.bloqueo } : {}),
    ...(input.kpiNombre !== undefined ? { kpiNombre: input.kpiNombre } : {}),
    ...(input.kpiMeta !== undefined ? { kpiMeta: input.kpiMeta } : {}),
    ...(input.kpiUnidad !== undefined ? { kpiUnidad: input.kpiUnidad } : {}),
    ...(input.kpiActual !== undefined ? { kpiActual: input.kpiActual } : {}),
  })
}
