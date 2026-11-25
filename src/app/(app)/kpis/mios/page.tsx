import Link from "next/link"
import { redirect } from "next/navigation"
import { PanelPersona } from "@/components/panel-persona"
import { puedeVerMatriz } from "@/lib/objetivos"
import { esAdmin } from "@/lib/permissions"
import { kpisDePersona } from "@/server/objetivos"
import { requireActor } from "@/server/session"

export default async function MisKpisPage() {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const vista = await kpisDePersona(actor)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl">Mis KPIs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Un KPI principal y hasta cuatro de apoyo. Las semanas 1 a 3 miden la línea base. En la semana 4 un administrador aprueba la meta.</p>
        </div>
        <Link href="/kpis/nuevo?nivel=persona&volver=/kpis/mios" className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Nuevo KPI</Link>
      </div>
      <PanelPersona kpis={vista.kpis} puedeAprobar={esAdmin(actor)} propio />
    </div>
  )
}
