"use client"

import { useRouter } from "next/navigation"

export function ElegirPersonaKpi({ personaId, personas }: { personaId: string; personas: { id: string; name: string }[] }) {
  const router = useRouter()
  return (
    <select aria-label="Persona" value={personaId} onChange={(event) => router.push(`/kpis/personas?persona=${event.target.value}`)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
      {personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
    </select>
  )
}
