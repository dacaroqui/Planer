import Link from "next/link"
import { BotonSla } from "@/components/boton-sla"
import { EquipoBadge, EstadoBadge, SlaBadge } from "@/components/insignias"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DONE_STATUSES, TEAM_LABEL } from "@/lib/domain"
import { formatDateTime } from "@/lib/format"
import { requireActor } from "@/server/session"
import { resumen } from "@/server/requests"

export default async function GerenciaPage() {
  const actor = await requireActor()
  const data = await resumen()
  const criticos = data.items.filter((item) => !DONE_STATUSES.has(item.status) && (item.sla.state === "VENCIDO" || item.sla.state === "EN_RIESGO" || item.sla.state === "EN_PAUSA"))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Gerencia</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Vista de solo lectura para ver cómo está la operación. Desde aquí no se cambia el estado ni se comenta.
          </p>
        </div>
        {actor.role === "ADMINISTRADOR" ? <BotonSla /> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.porEquipo.flatMap((equipo) => [
          <Cifra key={`${equipo.team}-a`} titulo={`${TEAM_LABEL[equipo.team]} abiertos`} valor={equipo.abiertos} />,
          <Cifra key={`${equipo.team}-v`} titulo={`${TEAM_LABEL[equipo.team]} vencidos`} valor={equipo.vencidos} />,
        ])}
      </div>
      <Card>
        <CardHeader><CardTitle>En riesgo, vencidos o en pausa</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {criticos.length === 0 ? <p className="text-sm text-muted-foreground">No hay requerimientos en esa situación.</p> : criticos.map((item) => (
            <Link key={item.code} href={`/requerimientos/${item.code}`} className="grid gap-2 rounded-lg border border-border px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="block font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {item.code} · {item.requester.name} · {item.assignee?.name ?? "Sin asignar"} · vence {formatDateTime(item.sla.dueAt)}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <EquipoBadge team={item.team} />
                <EstadoBadge status={item.status} />
                <SlaBadge state={item.sla.state} />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{data.resueltos7} requerimientos se resolvieron en los últimos 7 días.</p>
    </div>
  )
}

function Cifra({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle></CardHeader>
      <CardContent><p className="font-heading text-4xl">{valor}</p></CardContent>
    </Card>
  )
}
