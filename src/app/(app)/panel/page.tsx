import Link from "next/link"
import { EquipoBadge, EstadoBadge, SlaBadge } from "@/components/insignias"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROLE_LABEL, TEAM_LABEL } from "@/lib/domain"
import { formatDateTime } from "@/lib/format"
import { puedeRadicar } from "@/lib/permissions"
import { requireActor } from "@/server/session"
import { resumen } from "@/server/requests"

export default async function PanelPage() {
  const actor = await requireActor()
  const data = await resumen(actor)
  const porEquipo = (["DESARROLLO", "MARKETING"] as const).map((team) => ({
    team,
    abiertos: data.abiertos.filter((item) => item.team === team).length,
    vencidos: data.abiertos.filter((item) => item.team === team && item.sla.state === "VENCIDO").length,
    enRiesgo: data.abiertos.filter((item) => item.team === team && item.sla.state === "EN_RIESGO").length,
    enPausa: data.abiertos.filter((item) => item.team === team && item.sla.state === "EN_PAUSA").length,
  }))
  const mios = data.abiertos.filter((item) => item.requesterId === actor.id)
  const asignados = data.abiertos.filter((item) => item.assigneeId === actor.id)
  const riesgos = data.items.filter((item) => item.sla.state === "VENCIDO" || item.sla.state === "EN_RIESGO").slice(0, 6)
  const recientes = data.items.slice(0, 6)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[actor.role]}</p>
          <h1 className="font-heading text-4xl">Inicio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hola, {actor.name.split(" ")[0]}.</p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {data.abiertos.length} requerimientos abiertos · {data.resueltos7} resueltos en los últimos 7 días.
          </p>
        </div>
        {puedeRadicar(actor) ? (
          <Button asChild size="lg"><Link href="/requerimientos/nuevo">Radicar requerimiento</Link></Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra titulo="Abiertos" valor={data.abiertos.length} />
        <Cifra titulo="Radicados por usted" valor={mios.length} />
        <Cifra titulo="Asignados a usted" valor={asignados.length} />
        <Cifra titulo="Vencidos" valor={data.items.filter((item) => item.sla.state === "VENCIDO").length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Requieren atención</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {riesgos.length === 0 ? <p className="text-sm text-muted-foreground">Ningún requerimiento abierto está en riesgo o vencido.</p> : riesgos.map((item) => (
              <Link key={item.code} href={`/requerimientos/${item.code}`} className="rounded-lg border border-border px-3 py-2">
                <div className="flex flex-wrap gap-2"><SlaBadge state={item.sla.state} /><EquipoBadge team={item.team} /></div>
                <p className="mt-2 font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.code} · vence {formatDateTime(item.sla.dueAt)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Movimiento reciente</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {recientes.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay requerimientos.</p> : recientes.map((item) => (
              <Link key={item.code} href={`/requerimientos/${item.code}`} className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.code} · {TEAM_LABEL[item.team]} · {formatDateTime(item.updatedAt)}</span>
                </span>
                <EstadoBadge status={item.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {porEquipo.map((equipo) => (
          <Card key={equipo.team} size="sm">
            <CardHeader><CardTitle>{TEAM_LABEL[equipo.team]}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {equipo.abiertos} abiertos · {equipo.vencidos} vencidos · {equipo.enRiesgo} en riesgo · {equipo.enPausa} en pausa
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Los cerrados y cancelados no entran en los abiertos.</p>
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
