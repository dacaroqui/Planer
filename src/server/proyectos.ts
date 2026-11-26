import { DateTime } from "luxon"
import { appBaseUrl, createEmailProvider } from "@/lib/email"
import { correoAsignacionHabilitado } from "@/lib/correo-asignacion"
import { prisma } from "@/lib/prisma"
import { agruparTareas, avanceProyecto, avanceRequerimiento, tareaVencida } from "@/lib/avance"
import { DomainError, PermisoDenegado, TERMINAL_STATUSES, type Actor, type TeamName } from "@/lib/domain"
import { esAdmin, puedeAdministrar, puedeAsignar, puedeAutoasignarse, puedeRadicar, puedeVer, rolEn } from "@/lib/permissions"
import { transicionTareaValida } from "@/lib/plan-trabajo"
import { ZONE } from "@/lib/time"

export function puedeCrearProyecto(actor: Actor) {
  return actor.active && (esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER"))
}

export function puedeCrearProyectoAlRadicar(actor: Actor) {
  return puedeRadicar(actor)
}

export async function crearProyectoAlRadicar(
  actor: Actor,
  input: { empresaId: string; name: string; description?: string; team: TeamName },
) {
  if (!puedeCrearProyectoAlRadicar(actor)) throw new DomainError("Su perfil no puede crear un proyecto al radicar.")
  const name = input.name.trim()
  if (name.length < 3) throw new DomainError("El nombre del proyecto es muy corto.")
  const empresa = await prisma.empresa.findFirst({ where: { id: input.empresaId, active: true } })
  if (!empresa) throw new DomainError("Elija una empresa activa.")
  const hoy = DateTime.now().setZone(ZONE).startOf("day")
  return prisma.proyecto.create({
    data: {
      empresaId: empresa.id,
      name,
      description: (input.description ?? "").trim(),
      leaderId: actor.id,
      startsAt: hoy.toJSDate(),
      targetAt: hoy.plus({ days: 30 }).toJSDate(),
      status: "PLANIFICADO",
      team: input.team,
    },
  })
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
    team?: TeamName | null
    objetivoId?: string | null
    medio?: string
    fase?: string
    costo?: string | null
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
    ...(input.team !== undefined ? { team: input.team } : {}),
    ...(input.objetivoId !== undefined ? { objetivoId: input.objetivoId || null } : {}),
    ...(input.medio !== undefined ? { medio: input.medio.trim() } : {}),
    ...(input.fase !== undefined ? { fase: input.fase } : {}),
    ...(input.costo !== undefined ? { costo: input.costo && Number.isFinite(Number(input.costo)) ? Number(input.costo) : null } : {}),
  }
  if (data.name.length < 3) throw new DomainError("El nombre del proyecto es muy corto.")
  if (data.targetAt < data.startsAt) throw new DomainError("La fecha objetivo no puede ser anterior al inicio.")
  if (input.id) return prisma.proyecto.update({ where: { id: input.id }, data })
  return prisma.proyecto.create({ data })
}

async function contextoTarea(input: { requestId?: string | null; projectId?: string | null; experimentoId?: string | null }) {
  const request = input.requestId
    ? await prisma.request.findUnique({ where: { id: input.requestId }, include: { empresa: true, area: true } })
    : null
  const project = input.projectId ? await prisma.proyecto.findUnique({ where: { id: input.projectId } }) : null
  if (input.requestId && !request) throw new DomainError("El requerimiento no existe.")
  if (input.projectId && !project) throw new DomainError("El proyecto no existe.")
  if (request && project && request.empresaId !== project.empresaId) {
    throw new DomainError("El proyecto no pertenece a la empresa del requerimiento.")
  }
  const experimento = input.experimentoId ? await prisma.growthExperimento.findUnique({ where: { id: input.experimentoId } }) : null
  if (input.experimentoId && !experimento) throw new DomainError("El experimento no existe.")
  if (!request && !project && !experimento) throw new DomainError("La tarea debe colgar de un requerimiento, un proyecto o un experimento.")
  return { request, project, experimento }
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
    horasEstimadas?: string | null
    horasReales?: string | null
    fechaInicio?: string | null
    kpiNombre?: string | null
    kpiMeta?: string | null
    kpiUnidad?: string | null
    kpiActual?: string | null
    participantes?: string | null
    bloqueo?: string | null
    desdePlan?: boolean
  },
) {
  const title = input.title.trim()
  if (title.length < 3) throw new DomainError("Indique el título de la tarea.")
  const existente = input.id ? await prisma.tarea.findUnique({ where: { id: input.id } }) : null
  let requestId = input.requestId !== undefined ? input.requestId : existente?.requestId
  let projectId = input.projectId !== undefined ? input.projectId : existente?.projectId
  const parentId = input.parentId !== undefined ? input.parentId : existente?.parentId ?? null
  if (!input.id && !projectId) throw new DomainError("Toda actividad pertenece a un proyecto.")
  if (parentId) {
    const padre = await prisma.tarea.findUnique({ where: { id: parentId } })
    if (!padre) throw new DomainError("La tarea padre no existe.")
    if (padre.parentId) throw new DomainError("Una subtarea no puede contener otra subtarea.")
    if (!requestId) requestId = padre.requestId
    if (!projectId) projectId = padre.projectId
  }
  const { request, project } = await contextoTarea({ requestId, projectId })
  const team = request?.team ?? project?.team ?? "DESARROLLO"
  const puede = request ? puedeGestionarTareas(actor, request.team) : puedeCrearProyecto(actor) || esAdmin(actor)
  if (!input.desdePlan && !puede && !(request && actor.id === request.requesterId && !input.id)) {
    if (!puedeGestionarTareas(actor, team) && !esAdmin(actor)) {
      throw new DomainError("No puede gestionar tareas de esta área.")
    }
  }
  if (request && !puedeGestionarTareas(actor, request.team)) {
    throw new DomainError("Solo el equipo del área gestiona las tareas del requerimiento.")
  }
  if (!request && !puedeCrearProyecto(actor) && !input.desdePlan) {
    throw new DomainError("Solo un líder o el administrador crea tareas sueltas del proyecto.")
  }
  const nuevoResponsable = input.assigneeId !== undefined ? (input.assigneeId || null) : (existente?.assigneeId ?? null)
  const previoResponsable = existente?.assigneeId ?? null
  if (nuevoResponsable !== previoResponsable) {
    if (!nuevoResponsable) {
      if (request && !puedeAsignar(actor, request)) throw new DomainError("Solo el líder del área quita el responsable.")
    } else if (nuevoResponsable === actor.id && request) {
      if (!puedeAsignar(actor, request) && !puedeAutoasignarse(actor, request, request.area.allowSelfAssign)) {
        throw new DomainError("No puede asignarse esta tarea.")
      }
    } else if (request && !puedeAsignar(actor, request)) {
      throw new DomainError("Solo el líder del área asigna el responsable.")
    } else if (request || project) {
      const equipo = request?.team ?? project?.team ?? null
      if (!esAdmin(actor) && !equipo) throw new DomainError("Esa persona no es agente ni líder del equipo.")
      const miembro = await prisma.user.findFirst({
        where: esAdmin(actor)
          ? {
              id: nuevoResponsable,
              active: true,
              OR: [
                { role: "ADMINISTRADOR" },
                { areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } },
              ],
            }
          : {
              id: nuevoResponsable,
              active: true,
              areaRoles: { some: { team: equipo ?? undefined, role: { in: ["AGENTE", "LIDER"] } } },
            },
      })
      if (!miembro) throw new DomainError(esAdmin(actor) ? "Esa persona no está activa o no puede recibir trabajo." : "Esa persona no es agente ni líder del equipo.")
    }
  }
  if (existente && existente.status !== input.status && !transicionTareaValida(existente.status, input.status)) {
    throw new DomainError("Ese cambio de estado no está permitido.")
  }
  const completedAt = input.status === "HECHA" ? (existente?.completedAt ?? new Date()) : null
  const data = {
    title,
    assigneeId: nuevoResponsable,
    dueDate: input.dueDate !== undefined ? (input.dueDate ? fecha(input.dueDate) : null) : (existente?.dueDate ?? null),
    status: input.status,
    requestId: requestId || null,
    projectId: projectId || null,
    parentId: parentId || null,
    completedAt,
    ...(input.horasEstimadas !== undefined
      ? { horasEstimadas: input.horasEstimadas && Number.isFinite(Number(input.horasEstimadas)) ? Number(input.horasEstimadas) : null }
      : {}),
    ...(input.horasReales !== undefined
      ? { horasReales: input.horasReales && Number.isFinite(Number(input.horasReales)) ? Number(input.horasReales) : null }
      : {}),
    ...(input.fechaInicio !== undefined ? { fechaInicio: input.fechaInicio ? fecha(input.fechaInicio) : null } : {}),
    ...(input.kpiNombre !== undefined ? { kpiNombre: input.kpiNombre?.trim() || null } : {}),
    ...(input.kpiUnidad !== undefined ? { kpiUnidad: input.kpiUnidad?.trim() || null } : {}),
    ...(input.kpiMeta !== undefined ? { kpiMeta: input.kpiMeta && Number.isFinite(Number(input.kpiMeta)) ? Number(input.kpiMeta) : null } : {}),
    ...(input.kpiActual !== undefined ? { kpiActual: input.kpiActual && Number.isFinite(Number(input.kpiActual)) ? Number(input.kpiActual) : null } : {}),
    ...(input.participantes !== undefined ? { participantes: input.participantes?.trim() || null } : {}),
    ...(input.bloqueo !== undefined ? { bloqueo: input.bloqueo?.trim() || null } : {}),
  }
  const tarea = input.id
    ? await prisma.tarea.update({ where: { id: input.id }, data })
    : await prisma.tarea.create({ data: { ...data, createdById: actor.id } })
  const avisos: { userId: string; subject: string; body: string }[] = []
  if (nuevoResponsable && nuevoResponsable !== previoResponsable && nuevoResponsable !== actor.id) {
    avisos.push({
      userId: nuevoResponsable,
      subject: "",
      body: request ? `se te asignó ${request.code}: ${title}.` : `se te asignó la tarea «${title}».`,
    })
  }
  if (previoResponsable && nuevoResponsable !== previoResponsable && previoResponsable !== actor.id) {
    avisos.push({
      userId: previoResponsable,
      subject: "",
      body: `ya no tienes la tarea «${title}».`,
    })
  }
  if (avisos.length) {
    const destino = await prisma.user.findMany({
      where: { id: { in: avisos.map((item) => item.userId) }, active: true, deactivatedAt: null },
      select: { id: true, name: true, email: true },
    })
    const porId = new Map(destino.map((item) => [item.id, item]))
    const correo = correoAsignacionHabilitado()
    const href = request ? `/requerimientos/${request.code}` : "/planner"
    for (const aviso of avisos) {
      const persona = porId.get(aviso.userId)
      if (!persona) continue
      await prisma.notification.create({
        data: {
          userId: persona.id,
          requestId: request?.id ?? null,
          subject: `${persona.name}, ${aviso.body}`,
          body: `${persona.name}, ${aviso.body}`,
          href,
          dedupeKey: `tarea-${tarea.id}-${persona.id}-${Date.now()}`,
        },
      })
      if (correo) {
        const enlace = `${appBaseUrl()}${href}`
        try {
          await createEmailProvider().send({ to: persona.email, subject: `${persona.name}, ${aviso.body}`, text: `${persona.name}, ${aviso.body}\n${enlace}` })
        } catch (error) {
          console.error("[correo] No se pudo enviar", persona.email, error)
        }
      }
    }
  }
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

export async function eliminarTarea(actor: Actor, id: string) {
  if (!puedeAdministrar(actor)) throw new PermisoDenegado()
  const tarea = await prisma.tarea.findUnique({
    where: { id },
    include: { request: { select: { code: true } } },
  })
  if (!tarea) throw new DomainError("La tarea no existe.")
  const que = tarea.request ? `${tarea.request.code} · ${tarea.title}` : tarea.title
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ELIMINAR",
        entity: "Tarea",
        entityId: tarea.id,
        toValue: que,
      },
    })
    await tx.tarea.delete({ where: { id: tarea.id } })
  })
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
      if (actor.memberships.length > 0) return proyecto.requests.some((request) => puedeVer(actor, request)) || actor.memberships.some((item) => item.role === "LIDER")
      return proyecto.requests.some((request) => request.requesterId === actor.id)
    })
    .map((proyecto) => {
      const requerimientos = proyecto.requests.filter((request) => puedeVer(actor, request))
      const raices = agruparTareas(proyecto.tasks)
      const avance = avanceProyecto({ tareas: raices, requerimientos })
      const abiertos = requerimientos.filter((item) => !TERMINAL_STATUSES.has(item.status)).length
      const cerrados = requerimientos.length - abiertos
      const pendientes = raices.filter((item) => item.status !== "HECHA").length
      const hechas = raices.filter((item) => item.status === "HECHA").length
      const vencidas = proyecto.tasks.filter((item) => tareaVencida(item)).length
      return { ...proyecto, requests: requerimientos, avance, abiertos, cerrados, pendientes, hechas, vencidas }
    })
}

export async function detalleProyecto(actor: Actor, id: string) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      empresa: true,
      leader: true,
      requests: { include: { requester: true, assignee: true, type: true, tasks: true }, orderBy: { updatedAt: "desc" } },
      tasks: { include: { assignee: true, request: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
    },
  })
  if (!proyecto) return null
  const requests = proyecto.requests.filter((request) => puedeVer(actor, request))
  const visible = esAdmin(actor) || puedeCrearProyecto(actor) || requests.length > 0
  if (!visible) return null
  const ids = new Set(requests.map((request) => request.id))
  const tareas = proyecto.tasks.filter((tarea) => !tarea.requestId || ids.has(tarea.requestId))
  return {
    ...proyecto,
    requests,
    tasks: tareas,
    avance: avanceProyecto({ tareas: agruparTareas(tareas), requerimientos: requests }),
    avanceRequerimientos: requests.map((request) => ({
      ...request,
      avance: avanceRequerimiento(request.tasks, request.status),
    })),
  }
}

export { avanceRequerimiento }
