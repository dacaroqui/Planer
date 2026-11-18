"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Elegir } from "@/components/ui/elegir"
import { TEAM_LABEL, esTeam, type TeamName } from "@/lib/domain"

export function FiltrosPersonas({
  base,
  espacios,
  areas,
  equipos,
  ocultarEspacio = false,
}: {
  base: string
  espacios: { id: string; name: string }[]
  areas: { id: string; name: string }[]
  equipos: TeamName[]
  ocultarEspacio?: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  function ir(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString())
    if (!valor || valor === "0") next.delete(clave)
    else next.set(clave, valor)
    const query = next.toString()
    router.push(query ? `${base}?${query}` : base)
  }
  const espacio = params.get("espacio") ?? ""
  const equipo = params.get("equipo") ?? ""
  const area = params.get("area") ?? ""
  const vacias = params.get("vacias") === "1"
  const inactivos = params.get("inactivos") === "1"
  const chips = [
    espacio && !ocultarEspacio ? { clave: "espacio", texto: `Espacio: ${espacios.find((item) => item.id === espacio)?.name ?? espacio}` } : null,
    equipo ? { clave: "equipo", texto: `Equipo: ${esTeam(equipo) ? TEAM_LABEL[equipo] : equipo}` } : null,
    area ? { clave: "area", texto: `Área: ${areas.find((item) => item.id === area)?.name ?? area}` } : null,
    vacias ? { clave: "vacias", texto: "Solo sin asignaciones" } : null,
    params.get("inactivos") === "1" ? { clave: "inactivos", texto: "Inactivos" } : null,
  ].filter((item): item is { clave: string; texto: string } => Boolean(item))
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ocultarEspacio ? null : (
          <Elegir className="w-44" ariaLabel="Espacio" value={espacio} onValueChange={(valor) => ir("espacio", valor)} placeholder="Espacio" opciones={[{ value: "", label: "Espacio" }, ...espacios.map((item) => ({ value: item.id, label: item.name }))]} />
        )}
        <Elegir className="w-40" ariaLabel="Equipo" value={equipo} onValueChange={(valor) => ir("equipo", valor)} placeholder="Equipo" opciones={[{ value: "", label: "Equipo" }, ...equipos.map((item) => ({ value: item, label: TEAM_LABEL[item] ?? item }))]} />
        <Elegir className="w-44" ariaLabel="Área" value={area} onValueChange={(valor) => ir("area", valor)} placeholder="Área" opciones={[{ value: "", label: "Área" }, ...areas.map((item) => ({ value: item.id, label: item.name }))]} />
        <button type="button" aria-pressed={vacias} className={vacias ? "h-10 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white" : "h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"} onClick={() => ir("vacias", vacias ? "0" : "1")}>
          Solo sin asignaciones
        </button>
        <button type="button" aria-pressed={inactivos} className={inactivos ? "h-10 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white" : "h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"} onClick={() => ir("inactivos", inactivos ? "0" : "1")}>
          Inactivos
        </button>
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button key={chip.clave} type="button" onClick={() => ir(chip.clave, "")} className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs text-[#222B7C]">
              {chip.texto} ×
            </button>
          ))}
          <button type="button" className="text-xs font-medium text-[#1658B0] hover:underline" onClick={() => router.push(base)}>Limpiar</button>
        </div>
      ) : null}
    </div>
  )
}
