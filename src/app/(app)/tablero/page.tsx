import { Tablero } from "@/components/tablero"
import { equiposVisibles, esAdmin, rolEn, transicionesPara } from "@/lib/permissions"
import { nombreEstado } from "@/lib/flujo-oficial"
import { catalogoTablero } from "@/lib/catalogo-tablero"
import { requireActor } from "@/server/session"
import { listar, opcionesTablero } from "@/server/requests"
import { prisma } from "@/lib/prisma"

export default async function TableroPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; empresa?: string; proyecto?: string; area?: string }>
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
        <p className="mt-3 text-sm text-muted-foreground">Esa área no es la suya. El tablero solo muestra el equipo donde tiene rol.</p>
      </div>
    )
  }
  const [estados, opciones] = await Promise.all([
    prisma.workflowState.findMany({ where: { team, active: true, hiddenOnBoard: false }, orderBy: { sortOrder: "asc" } }),
    opcionesTablero(actor, team),
  ])
  const empresas = opciones.empresas
  const proyectos = opciones.proyectos
  const areasOrg = opciones.areas
  const columnas = estados.map((estado) => estado.name)
  const data = await listar(actor, { team, openOnly: true, pageSize: 100, empresaId: params.empresa, projectId: params.proyecto, areaId: params.area })
  const transiciones = await prisma.workflowTransition.findMany({ where: { team, active: true } })
  const catalogo = catalogoTablero(transiciones.map((item) => ({ ...item, team })))
  const columnaDe = (status: string) => estados.find((estado) => estado.key === status)?.name ?? nombreEstado(team, status)
  const agentes = await prisma.user.findMany({
    where: { active: true, areaRoles: { some: { team, role: { in: ["AGENTE", "LIDER"] } } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl">Tablero {team === "DESARROLLO" ? "de Desarrollo" : "de Marketing"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Arrastre una tarjeta solo si su rol puede hacer esa transición. Si no, vuelve a su lugar.</p>
        </div>
        {(esAdmin(actor) || equiposVisibles(actor).length > 1) ? (
          <div className="flex gap-2 text-sm">
            <a className="underline" href="/tablero?team=DESARROLLO">Desarrollo</a>
            <a className="underline" href="/tablero?team=MARKETING">Marketing</a>
          </div>
        ) : null}
      </div>
      <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        <select name="area" defaultValue={params.area ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Área">
          <option value="">Todas las áreas</option>
          {areasOrg.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="h-9 rounded-lg bg-primary text-sm text-primary-foreground" type="submit">Filtrar</button>
      </form>
      <Tablero
        soloLectura={!esAdmin(actor) && rolEn(actor, team) === "OBSERVADOR"}
        columnas={columnas}
        agentes={agentes}
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
            assigneeId: item.assigneeId,
            committedDate: item.committedDate ? item.committedDate.toISOString().slice(0, 10) : null,
            tipo: item.type.name,
            status: item.status,
            column: columnaDe(item.status),
            sla: item.sla.state,
            exigeProyecto: Boolean(item.empresa.exigirProyectoAlClasificar),
            projectId: item.projectId,
            proyectos: proyectos.filter((proyecto) => proyecto.empresaId === item.empresaId).map((proyecto) => ({ id: proyecto.id, name: proyecto.name })),
            moves,
          }
        })}
      />
    </div>
  )
}
