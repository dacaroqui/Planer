import Link from "next/link"
import { redirect } from "next/navigation"
import { Chispa, SelloBloqueo, TextoKpi } from "@/components/objetivos-ui"
import { TEAM_LABEL, puedeEditarArea, puedeVerMatriz } from "@/lib/objetivos"
import { kpisDeArea } from "@/server/objetivos"
import { requireActor } from "@/server/session"

export default async function KpisAreaPage() {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const paneles = await kpisDeArea(actor)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-4xl">KPIs por área</h1>
        <Link href="/kpis/nuevo?nivel=area&volver=/kpis/areas" className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Nuevo KPI de área</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {paneles.map((panel) => (
          <section key={panel.area} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl">{TEAM_LABEL[panel.area]}</h2>
              <span className="text-sm text-[#1658B0]">Avance {panel.avance}%</span>
            </div>
            <ul className="mt-3 grid gap-3">
              {panel.kpis.length === 0 ? <li className="text-sm text-muted-foreground">Esta área todavía no tiene KPIs.</li> : panel.kpis.map((kpi) => (
                <li key={kpi.id} className="rounded-lg border border-[#F0F2F5] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <TextoKpi nombre={kpi.nombre} actual={kpi.actual} meta={kpi.meta} unidad={kpi.unidad} />
                    <Chispa valores={kpi.tendencia} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.objetivoId ? "Del objetivo" : "Del área"}{puedeEditarArea(actor, panel.area) ? <> · <Link href={`/kpis/${kpi.id}/editar`} className="text-[#1658B0]">Editar</Link></> : null}</p>
                  <SelloBloqueo bloqueado={kpi.bloqueado} motivo={kpi.motivoBloqueo} />
                </li>
              ))}
            </ul>
            {!puedeEditarArea(actor, panel.area) ? <p className="mt-2 text-xs text-muted-foreground">Solo el líder de esta área edita estos KPIs.</p> : null}
          </section>
        ))}
      </div>
    </div>
  )
}
