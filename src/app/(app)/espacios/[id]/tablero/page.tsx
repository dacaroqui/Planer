import { notFound } from "next/navigation"
import { TableroEspacio } from "@/components/tablero-espacio"
import { equiposVisibles, esAdmin, rolEn, transicionesPara } from "@/lib/permissions"
import { catalogoTablero } from "@/lib/catalogo-tablero"
import { prisma } from "@/lib/prisma"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function TableroEspacioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ proyecto?: string }>
}) {
  const actor = await requireActor()
  const { id } = await params
  const query = await searchParams
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const casos = await listar(actor, { empresaId: id, projectId: query.proyecto, pageSize: 120, conPausas: false, conTareas: false })
  const [estados, transiciones] = await Promise.all([
    prisma.workflowState.findMany({ where: { active: true, hiddenOnBoard: false } }),
    prisma.workflowTransition.findMany({ where: { active: true } }),
  ])
  const porEquipo = new Map<string, ReturnType<typeof catalogoTablero>>()
  for (const team of ["DESARROLLO", "MARKETING"] as const) {
    porEquipo.set(team, catalogoTablero(transiciones.filter((item) => item.team === team).map((item) => ({ ...item, team }))))
  }
  return (
    <div className="space-y-4">
      <TableroEspacio
        actorId={actor.id}
        espacioId={id}
        estados={estados.map((item) => ({ key: item.key, name: item.name, category: item.category }))}
        tarjetas={casos.items.map((item) => {
          const catalogo = porEquipo.get(item.team) ?? []
          const puede = esAdmin(actor) || Boolean(rolEn(actor, item.team)) || equiposVisibles(actor).includes(item.team)
          const moves = puede ? transicionesPara(actor, {
            id: item.id,
            team: item.team,
            status: item.status,
            requesterId: item.requesterId,
            assigneeId: item.assigneeId,
            resolvedAt: item.resolvedAt,
          }, catalogo).map((move) => ({
            name: move.name,
            to: move.to,
            requiresComment: Boolean(move.requiresComment),
            requiresDelivery: Boolean(move.requiresDelivery),
          })) : []
          return {
            code: item.code,
            title: item.title,
            status: item.status,
            priority: item.priority,
            tipo: item.type.name,
            area: item.area.name,
            marca: item.brand,
            asignado: item.assignee?.name ?? "",
            assigneeId: item.assigneeId,
            moves,
          }
        })}
      />
    </div>
  )
}
