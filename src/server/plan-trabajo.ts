import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado, type Actor, type TeamName } from "@/lib/domain"
import {
  presentarTarea,
  puedeEditarPlan,
  transicionTareaValida,
  type EstadoTareaPlan,
  type FilaPlan,
} from "@/lib/plan-trabajo"
import { guardarTarea, listarProyectos } from "@/server/proyectos"

export async function listarPlan(actor: Actor): Promise<FilaPlan[]> {
  const proyectos = await listarProyectos(actor)
  if (proyectos.length === 0) return []
  const tareas = await prisma.tarea.findMany({
    where: { projectId: { in: proyectos.map((proyecto) => proyecto.id) }, parentId: null },
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
      assigneeId: tarea.assigneeId,
      assigneeName: tarea.assignee?.name ?? null,
      proyectoId: tarea.project.id,
      proyecto: tarea.project.name,
      team: tarea.project.team,
      description: tarea.project.description,
      startsAt: tarea.project.startsAt,
      targetAt: tarea.project.targetAt,
      puedeEditar: puedeEditarPlan(actor, tarea.project.team),
    })]
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
  input: { id: string; status?: EstadoTareaPlan; assigneeId?: string | null; bloqueo?: string | null },
) {
  const tarea = await prisma.tarea.findUnique({
    where: { id: input.id },
    include: { project: true },
  })
  if (!tarea?.projectId || !tarea.project) throw new DomainError("La tarea no está en un proyecto del plan.")
  const visibles = await listarProyectos(actor)
  if (!visibles.some((proyecto) => proyecto.id === tarea.projectId)) {
    throw new PermisoDenegado("No puede ver este proyecto.")
  }
  if (!puedeEditarPlan(actor, tarea.project.team)) {
    throw new PermisoDenegado("Solo el líder del área o un administrador edita el plan.")
  }
  if (input.status && !transicionTareaValida(tarea.status, input.status)) {
    throw new DomainError("Ese cambio de estado no está permitido. Pase por En curso.")
  }
  const cambiaEstado = input.status && input.status !== tarea.status
  const cambiaResponsable = input.assigneeId !== undefined && (input.assigneeId || null) !== tarea.assigneeId
  if (cambiaEstado || cambiaResponsable) {
    await guardarTarea(actor, {
      id: tarea.id,
      title: tarea.title,
      status: input.status ?? tarea.status,
      assigneeId: input.assigneeId !== undefined ? input.assigneeId : tarea.assigneeId,
      projectId: tarea.projectId,
      requestId: tarea.requestId,
    })
  }
  if (input.bloqueo !== undefined) {
    await prisma.tarea.update({
      where: { id: tarea.id },
      data: { bloqueo: input.bloqueo?.trim() || null },
    })
  }
}
