import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { agruparTareas, avanceProyecto, avanceRequerimiento, tareaVencida } from "@/lib/avance"
import { DomainError, TERMINAL_STATUSES, type Actor, type TeamName } from "@/lib/domain"
import { esAdmin, puedeVer, rolEn } from "@/lib/permissions"
import { ZONE } from "@/lib/time"

export function puedeCrearProyecto(actor: Actor) {
  return actor.active && (esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER"))
}

export function puedeGestionarEmpresa(actor: Actor) {
  return puedeCrearProyecto(actor)
}

export function puedeGestionarTareas(actor: Actor, team: TeamName) {
  if (!actor.active) return false
  if (esAdmin(actor)) return true
  const rol = rolEn(actor, team)
  return rol === "AGENTE" || rol === "LIDER"
}

function fecha(value: string) {
  const parsed = DateTime.fromISO(value, { zone: ZONE })
  if (!parsed.isValid) throw new DomainError("La fecha no es válida.")
  return parsed.toJSDate()
}

export async function guardarEmpresa(actor: Actor, input: { id?: string; name: string; exigirProyectoAlClasificar: boolean; active: boolean }) {
  if (!puedeGestionarEmpresa(actor)) throw new DomainError("Solo un líder o el administrador gestiona empresas.")
  const name = input.name.trim()
  if (name.length < 2) throw new DomainError("Indique el nombre de la empresa.")
  if (input.id) {
    return prisma.empresa.update({
      where: { id: input.id },
      data: { name, active: input.active, exigirProyectoAlClasificar: input.exigirProyectoAlClasificar },
    })
  }
  return prisma.empresa.create({
    data: { name, active: input.active, exigirProyectoAlClasificar: input.exigirProyectoAlClasificar },
  })
}

export async function guardarProyecto(
  actor: Actor,
  input: {
    id?: string
    empresaId: string
    name: string
    description: string
    leaderId: string
    startsAt: string
    targetAt: string
    status: "PLANIFICADO" | "EN_CURSO" | "EN_PAUSA" | "CERRADO"
  },
) {
  if (!puedeCrearProyecto(actor)) throw new DomainError("Solo un líder o el administrador crea proyectos.")
  const empresa = await prisma.empresa.findFirst({ where: { id: input.empresaId, active: true } })
  if (!empresa) throw new DomainError("Elija una empresa activa.")
  const leader = await prisma.user.findFirst({ where: { id: input.leaderId, active: true } })
  if (!leader) throw new DomainError("Elija un responsable activo.")
  const data = {
    empresaId: empresa.id,
    name: input.name.trim(),
    description: input.description.trim(),
    leaderId: leader.id,
    startsAt: fecha(input.startsAt),
    targetAt: fecha(input.targetAt),
    status: input.status,
  }
  if (data.name.length < 3) throw new DomainError("El nombre del proyecto es muy corto.")
  if (data.targetAt < data.startsAt) throw new DomainError("La fecha objetivo no puede ser anterior al inicio.")
  if (input.id) return prisma.proyecto.update({ where: { id: input.id }, data })
  return prisma.proyecto.create({ data })
}

async function contextoTarea(input: { requestId?: string | null; projectId?: string | null }) {
  const request = input.requestId
    ? await prisma.request.findUnique({ where: { id: input.requestId }, include: { empresa: true } })
    : null
  const project = input.projectId ? await prisma.proyecto.findUnique({ where: { id: input.projectId } }) : null
  if (input.requestId && !request) throw new DomainError("El requerimiento no existe.")
  if (input.projectId && !project) throw new DomainError("El proyecto no existe.")
  if (request && project && request.empresaId !== project.empresaId) {
    throw new DomainError("El proyecto no pertenece a la empresa del requerimiento.")
  }
  if (!request && !project) throw new DomainError("La tarea debe colgar de un requerimiento o de un proyecto.")
  return { request, project }
}

export async function guardarTarea(
  actor: Actor,
  input: {
    id?: string
    title: string
    assigneeId?: string | null
    dueDate?: string | null
    status: "PENDIENTE" | "EN_CURSO" | "HECHA"
    requestId?: string | null
    projectId?: string | null
    parentId?: string | null
  },
) {
  const title = input.title.trim()
  if (title.length < 3) throw new DomainError("Indique el título de la tarea.")
  const existente = input.id ? await prisma.tarea.findUnique({ where: { id: input.id } }) : null
  let requestId = input.requestId !== undefined ? input.requestId : existente?.requestId
  let projectId = input.projectId !== undefined ? input.projectId : existente?.projectId
  const parentId = input.parentId !== undefined ? input.parentId : existente?.parentId ?? null
  if (parentId) {
    const padre = await prisma.tarea.findUnique({ where: { id: parentId } })
    if (!padre) throw new DomainError("La tarea padre no existe.")
    if (padre.parentId) throw new DomainError("Una subtarea no puede contener otra subtarea.")
    if (!requestId) requestId = padre.requestId
    if (!projectId) projectId = padre.projectId
  }
  const { request } = await contextoTarea({ requestId, projectId })
  const team = request?.team ?? "DESARROLLO"
  const puede = request ? puedeGestionarTareas(actor, request.team) : puedeCrearProyecto(actor) || esAdmin(actor)
  if (!puede && !(request && actor.id === request.requesterId && !input.id)) {
    if (!puedeGestionarTareas(actor, team) && !esAdmin(actor)) {
      throw new DomainError("No puede gestionar tareas de esta área.")
    }
  }
  if (request && !puedeGestionarTareas(actor, request.team)) {
    throw new DomainError("Solo el equipo del área gestiona las tareas del requerimiento.")
  }
  if (!request && !puedeCrearProyecto(actor)) {
    throw new DomainError("Solo un líder o el administrador crea tareas sueltas del proyecto.")
  }
  const completedAt = input.status === "HECHA" ? (existente?.completedAt ?? new Date()) : null
  const data = {
    title,
    assigneeId: input.assigneeId !== undefined ? (input.assigneeId || null) : (existente?.assigneeId ?? null),
    dueDate: input.dueDate !== undefined ? (input.dueDate ? fecha(input.dueDate) : null) : (existente?.dueDate ?? null),
    status: input.status,
    requestId: requestId || null,
    projectId: projectId || null,
    parentId: parentId || null,
    completedAt,
  }
  const tarea = input.id
    ? await prisma.tarea.update({ where: { id: input.id }, data })
    : await prisma.tarea.create({ data: { ...data, createdById: actor.id } })
  if (request) {
    await prisma.activity.create({
      data: {
        requestId: request.id,
        actorId: actor.id,
        kind: "TASK",
        field: "tarea",
        message: input.status === "HECHA" ? `Marcó la tarea «${title}» como hecha.` : `Actualizó la tarea «${title}» (${input.status === "EN_CURSO" ? "en curso" : input.status === "PENDIENTE" ? "pendiente" : "hecha"}).`,
        toValue: input.status,
      },
    })
  }
  return tarea
}

export async function listarProyectos(actor: Actor, empresaId?: string) {
  const proyectos = await prisma.proyecto.findMany({
    where: {
      ...(empresaId ? { empresaId } : {}),
      empresa: { active: true },
    },
    include: {
      empresa: true,
      leader: true,
      requests: { select: { id: true, status: true, team: true, requesterId: true } },
      tasks: { select: { id: true, status: true, dueDate: true, parentId: true } },
    },
    orderBy: { name: "asc" },
  })
  return proyectos
    .filter((proyecto) => {
      if (esAdmin(actor) || puedeCrearProyecto(actor)) return true
      if (actor.memberships.some((item) => item.role === "OBSERVADOR" || item.role === "AGENTE" || item.role === "LIDER")) return true
      return proyecto.requests.some((request) => request.requesterId === actor.id)
    })
    .map((proyecto) => {
      const raices = agruparTareas(proyecto.tasks)
      const avance = avanceProyecto({ tareas: raices, requerimientos: proyecto.requests })
      const abiertos = proyecto.requests.filter((item) => !TERMINAL_STATUSES.has(item.status)).length
      const cerrados = proyecto.requests.length - abiertos
      const pendientes = raices.filter((item) => item.status !== "HECHA").length
      const hechas = raices.filter((item) => item.status === "HECHA").length
      const vencidas = proyecto.tasks.filter((item) => tareaVencida(item)).length
      return { ...proyecto, avance, abiertos, cerrados, pendientes, hechas, vencidas }
    })
}

export async function detalleProyecto(actor: Actor, id: string) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      empresa: true,
      leader: true,
      requests: { include: { requester: true, assignee: true, type: true, tasks: true }, orderBy: { updatedAt: "desc" } },
      tasks: { include: { assignee: true, request: true }, orderBy: { createdAt: "asc" } },
    },
  })
  if (!proyecto) return null
  const visible = esAdmin(actor)
    || puedeCrearProyecto(actor)
    || actor.memberships.length > 0
    || proyecto.requests.some((request) => puedeVer(actor, request))
  if (!visible) return null
  const tareas = [
    ...proyecto.tasks,
    ...proyecto.requests.flatMap((request) => request.tasks.filter((tarea) => tarea.projectId !== proyecto.id)),
  ]
  const unicas = [...new Map(tareas.map((tarea) => [tarea.id, tarea])).values()]
  return {
    ...proyecto,
    avance: avanceProyecto({ tareas: agruparTareas(unicas), requerimientos: proyecto.requests }),
    avanceRequerimientos: proyecto.requests.map((request) => ({
      ...request,
      avance: avanceRequerimiento(request.tasks, request.status),
    })),
  }
}

export { avanceRequerimiento }
