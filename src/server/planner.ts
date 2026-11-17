import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { Actor } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"

export async function listarPlanner(
  actor: Actor,
  filtros: { empresaId?: string; projectId?: string; assigneeId?: string },
) {
  const teams = actor.memberships.map((item) => item.team)
  const and: Prisma.TareaWhereInput[] = [{ parentId: null }]
  if (filtros.projectId) and.push({ projectId: filtros.projectId })
  if (filtros.assigneeId) and.push({ assigneeId: filtros.assigneeId })
  if (filtros.empresaId) {
    and.push({
      OR: [
        { project: { empresaId: filtros.empresaId } },
        { request: { empresaId: filtros.empresaId } },
      ],
    })
  }
  if (!esAdmin(actor)) {
    const propio = { OR: [{ requesterId: actor.id }, { team: { in: teams } }] }
    and.push({
      OR: [
        { request: propio },
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
      children: { include: { assignee: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  })
}
