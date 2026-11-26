import Link from "next/link"
import { redirect } from "next/navigation"
import { ElegirPersonaKpi } from "@/components/elegir-persona-kpi"
import { PanelPersona } from "@/components/panel-persona"
import { puedeVerMatriz } from "@/lib/objetivos"
import { esAdmin } from "@/lib/permissions"
import { kpisDePersona } from "@/server/objetivos"
import { requireActor } from "@/server/session"

export default async function KpisPersonaPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  if (!esAdmin(actor) && !actor.memberships.some((item) => item.role === "LIDER")) redirect("/kpis/mios")
  const params = await searchParams
  const vista = await kpisDePersona(actor, params.persona)
  const nuevo = `/kpis/nuevo?nivel=persona&persona=${vista.personaId}&volver=/kpis/personas`
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl">KPIs por persona</h1>
        <Link href={nuevo} className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Nuevo KPI</Link>
      </div>
      <ElegirPersonaKpi personaId={vista.personaId} personas={vista.personas} />
      {vista.kpis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1658B0] bg-white p-6">
          <p className="text-sm text-muted-foreground">Todavía no hay KPIs. Un principal y hasta cuatro de apoyo.</p>
          <Link href={nuevo} className="mt-3 inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Nuevo KPI</Link>
        </div>
      ) : (
        <PanelPersona kpis={vista.kpis} puedeAprobar={esAdmin(actor)} propio={vista.personaId === actor.id} puedeEditar />
      )}
    </div>
  )
}
