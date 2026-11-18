"use client"

import { useRouter, useSearchParams } from "next/navigation"

const selecto = "h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm text-[#15122A]"

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
  equipos: Array<"DESARROLLO" | "MARKETING">
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
  const chips = [
    espacio && !ocultarEspacio ? { clave: "espacio", texto: `Espacio: ${espacios.find((item) => item.id === espacio)?.name ?? espacio}` } : null,
    equipo ? { clave: "equipo", texto: `Equipo: ${equipo === "DESARROLLO" ? "Desarrollo" : "Marketing"}` } : null,
    area ? { clave: "area", texto: `Área: ${areas.find((item) => item.id === area)?.name ?? area}` } : null,
    vacias ? { clave: "vacias", texto: "Solo sin asignaciones" } : null,
  ].filter((item): item is { clave: string; texto: string } => Boolean(item))
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ocultarEspacio ? null : (
          <select aria-label="Espacio" className={selecto} value={espacio} onChange={(event) => ir("espacio", event.target.value)}>
            <option value="">Espacio</option>
            {espacios.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <select aria-label="Equipo" className={selecto} value={equipo} onChange={(event) => ir("equipo", event.target.value)}>
          <option value="">Equipo</option>
          {equipos.map((item) => <option key={item} value={item}>{item === "DESARROLLO" ? "Desarrollo" : "Marketing"}</option>)}
        </select>
        <select aria-label="Área" className={selecto} value={area} onChange={(event) => ir("area", event.target.value)}>
          <option value="">Área</option>
          {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button type="button" aria-pressed={vacias} className={vacias ? "h-10 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white" : "h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"} onClick={() => ir("vacias", vacias ? "0" : "1")}>
          Solo sin asignaciones
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
