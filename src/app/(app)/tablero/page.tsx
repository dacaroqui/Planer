import { Tablero } from "@/components/tablero"
import { esAdmin, rolEn, transicionesPara } from "@/lib/permissions"
import { nombreEstado } from "@/lib/flujo-oficial"
import { requireActor } from "@/server/session"
import { listar } from "@/server/requests"
import { prisma } from "@/lib/prisma"

export default async function TableroPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; empresa?: string; proyecto?: string }>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const areas = actor.memberships.map((item) => item.team)
  const team = params.team === "MARKETING" || params.team === "DESARROLLO"
    ? params.team
    : areas[0] ?? "DESARROLLO"
  if (!esAdmin(actor) && !rolEn(actor, team)) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Tablero</h1>
        <p className="mt-3 text-sm text-muted-foreground">El tablero es del área donde tiene rol de agente, líder u observador.</p>
      </div>
    )
  }
  const [estados, empresas, proyectos] = await Promise.all([
    prisma.workflowState.findMany({ where: { team, active: true, hiddenOnBoard: false }, orderBy: { sortOrder: "asc" } }),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.proyecto.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, empresaId: true } }),
  ])
  const columnas = [...new Set(estados.map((estado) => estado.boardColumn))]
  const data = await listar(actor, { team, openOnly: true, pageSize: 100, empresaId: params.empresa, projectId: params.proyecto })
  const transiciones = await prisma.workflowTransition.findMany({ where: { team, active: true } })
  const catalogo = transiciones.map((item) => ({
    team,
    name: item.name,
    from: item.fromKeys.split(","),
    to: item.toKey,
    roles: item.allowedRoles.split(",") as Array<"LIDER" | "RESPONSABLE" | "SOLICITANTE" | "QA">,
    slaEffect: item.slaEffect as "NONE",
  }))
  const columnaDe = (status: string) => estados.find((estado) => estado.key === status)?.boardColumn ?? nombreEstado(team, status)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl">Tablero {team === "DESARROLLO" ? "de Desarrollo" : "de Marketing"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Arrastre una tarjeta solo si su rol puede hacer esa transición. Si no, vuelve a su lugar.</p>
        </div>
        {(esAdmin(actor) || actor.memberships.length > 1) ? (
          <div className="flex gap-2 text-sm">
            <a className="underline" href="/tablero?team=DESARROLLO">Desarrollo</a>
            <a className="underline" href="/tablero?team=MARKETING">Marketing</a>
          </div>
        ) : null}
      </div>
      <form className="grid gap-2 sm:grid-cols-3">
        <input type="hidden" name="team" value={team} />
        <select name="empresa" defaultValue={params.empresa ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Empresa">
          <option value="">Todas las empresas</option>
          {empresas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="proyecto" defaultValue={params.proyecto ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Proyecto">
          <option value="">Todos los proyectos</option>
          {proyectos.filter((item) => !params.empresa || item.empresaId === params.empresa).map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <button className="h-9 rounded-lg bg-primary text-sm text-primary-foreground" type="submit">Filtrar</button>
      </form>
      <Tablero
        soloLectura={!esAdmin(actor) && rolEn(actor, team) === "OBSERVADOR"}
        columnas={columnas}
        tarjetas={data.items.map((item) => {
          const moves = transicionesPara(actor, {
            id: item.id,
            team: item.team,
            status: item.status,
            requesterId: item.requesterId,
            assigneeId: item.assigneeId,
            resolvedAt: item.resolvedAt,
          }, catalogo).map((move) => ({
            name: move.name,
            to: move.to,
            column: columnaDe(move.to),
            requiresComment: Boolean(move.requiresComment),
            requiresDelivery: Boolean(move.requiresDelivery),
            requiresAssignee: Boolean(move.requiresAssignee),
            requiresCommittedDate: Boolean(move.requiresCommittedDate),
          }))
          return {
            code: item.code,
            title: item.title,
            brand: item.brand,
            priority: item.priority,
            assignee: item.assignee?.name ?? "Sin responsable",
            tipo: item.type.name,
            status: item.status,
            column: columnaDe(item.status),
            sla: item.sla.state,
            moves,
          }
        })}
      />
    </div>
  )
}
