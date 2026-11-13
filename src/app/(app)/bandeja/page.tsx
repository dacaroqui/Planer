import { Suspense } from "react"
import { Filtros } from "@/components/filtros"
import { Paginacion, TablaRequerimientos } from "@/components/tabla"
import { STATUS_LABEL, TEAM_LABEL } from "@/lib/domain"
import { consultaDesde, queryString } from "@/lib/list-query"
import { requireActor } from "@/server/session"
import { listar } from "@/server/requests"

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  if (actor.role !== "ADMINISTRADOR" && !actor.team) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Bandeja</h1>
        <p className="mt-3 text-sm text-muted-foreground">La bandeja es del equipo que ejecuta. Su perfil no tiene un equipo de Desarrollo o Marketing.</p>
      </div>
    )
  }
  const data = await listar(actor, consultaDesde(params, actor, actor.team && actor.role !== "ADMINISTRADOR"
    ? { queueTeam: actor.team }
    : { openOnly: true }))
  const titulo = actor.team && actor.role !== "ADMINISTRADOR" ? `Bandeja de ${TEAM_LABEL[actor.team]}` : "Bandeja de ambos equipos"
  const estados = Object.entries(STATUS_LABEL)
    .filter(([value]) => value !== "CERRADO" && value !== "CANCELADO")
    .map(([value, label]) => ({ value, label }))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Lo que sigue abierto para el equipo. Tome, asigne o pida lo que falte desde cada requerimiento.</p>
      </div>
      <Suspense>
        <Filtros ruta="/bandeja" estados={estados} mostrarEquipo={actor.role === "ADMINISTRADOR"} />
      </Suspense>
      <TablaRequerimientos items={data.items} vacio="La bandeja está al día con estos filtros." />
      <Paginacion page={data.page} pages={data.pages} ruta="/bandeja" query={queryString(params)} />
    </div>
  )
}
