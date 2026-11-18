import Link from "next/link"
import { notFound } from "next/navigation"
import { TableroEspacio } from "@/components/tablero-espacio"
import { TEAMS } from "@/lib/domain"
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
  for (const team of TEAMS) {
    porEquipo.set(team, catalogoTablero(transiciones.filter((item) => item.team === team).map((item) => ({ ...item, team }))))
  }
  const tareas = await prisma.tarea.findMany({
    where: { status: { not: "HECHA" }, OR: [{ request: { empresaId: id } }, { project: { empresaId: id } }] },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, assignee: { select: { name: true } }, request: { select: { code: true } } },
  })
  return (
    <div className="space-y-4">
      <TableroEspacio
        actorId={actor.id}
        espacioId={id}
        puedeEliminar={actor.isAdmin}
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
            requiresAssignee: Boolean(move.requiresAssignee),
            requiresCommittedDate: Boolean(move.requiresCommittedDate),
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
      <section className="rounded-xl border border-[#E4E7EC] bg-white">
        <h2 className="border-b border-[#E4E7EC] px-4 py-3 text-sm font-semibold">Tareas del espacio</h2>
        {tareas.length === 0 ? <p className="px-4 py-4 text-sm text-muted-foreground">No hay tareas abiertas ligadas a solicitudes de este espacio.</p> : (
          <ul className="divide-y divide-[#E4E7EC]">
            {tareas.map((tarea) => (
              <li key={tarea.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                {tarea.request ? <Link href={`/requerimientos/${tarea.request.code}`} className="rounded-full bg-[#E7F0FB] px-2 py-0.5 text-xs font-medium text-[#1658B0]">{tarea.request.code}</Link> : null}
                <span>{tarea.title}</span>
                <span className="text-xs text-muted-foreground">{tarea.assignee?.name ?? "Sin responsable"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
