import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { Actor } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"
import { puedeVerGrowth } from "@/lib/growth"

export async function listarPlanner(
  actor: Actor,
  filtros: { empresaId?: string; projectId?: string; assigneeId?: string },
) {
  const teams = actor.memberships.map((item) => item.team)
  const and: Prisma.TareaWhereInput[] = [{ parentId: null }]
  if (filtros.projectId) {
    and.push(puedeVerGrowth(actor)
      ? { OR: [{ projectId: filtros.projectId }, { experimentoId: { not: null } }] }
      : { projectId: filtros.projectId })
  }
  if (filtros.assigneeId) and.push({ assigneeId: filtros.assigneeId })
  if (filtros.empresaId) {
    and.push({
      OR: [
        { project: { empresaId: filtros.empresaId } },
        { request: { empresaId: filtros.empresaId } },
        ...(puedeVerGrowth(actor) ? [{ experimentoId: { not: null } }] : []),
      ],
    })
  }
  if (!esAdmin(actor)) {
    const propio = { OR: [{ requesterId: actor.id }, { team: { in: teams } }] }
    and.push({
      OR: [
        { request: propio },
        { experimentoId: { not: null }, OR: [{ assigneeId: actor.id }, { createdById: actor.id }, { experimento: { ownerId: actor.id } }] },
        {
          requestId: null,
          project: { requests: { some: propio } },
          OR: [
            { assigneeId: null },
            { assigneeId: actor.id },
            { assignee: { areaRoles: { some: { team: { in: teams } } } } },
          ],
        },
      ],
    })
  }
  return prisma.tarea.findMany({
    where: { AND: and },
    include: {
      assignee: true,
      project: { include: { empresa: true } },
      request: true,
      experimento: { select: { id: true, nombre: true } },
      children: { include: { assignee: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  })
}
