import { redirect } from "next/navigation"
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
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-4xl">KPIs por persona</h1>
      <form action="/kpis/personas">
        <select name="persona" defaultValue={vista.personaId} aria-label="Persona" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm" onChange={undefined}>
          {vista.personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
        </select>
        <button className="ml-2 h-10 rounded-lg bg-[#1658B0] px-3 text-sm text-white" type="submit">Ver</button>
      </form>
      <PanelPersona kpis={vista.kpis} puedeAprobar={esAdmin(actor)} propio={vista.personaId === actor.id} />
    </div>
  )
}
