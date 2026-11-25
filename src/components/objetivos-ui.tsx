import { TIPO_KPI_LABEL } from "@/lib/objetivos"

export function BarraMeta({ actual, meta }: { actual: number | null; meta: number | null }) {
  const avance = meta ? Math.max(0, Math.min(100, Math.round(((actual ?? 0) / meta) * 100))) : 0
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#E7F0FB]" aria-label={`Avance ${avance}%`}>
      <span className="block h-full bg-[#1658B0]" style={{ width: `${avance}%` }} />
    </span>
  )
}

export function Chispa({ valores }: { valores: number[] }) {
  if (valores.length < 2) return <span className="text-xs text-muted-foreground">Sin tendencia</span>
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const puntos = valores.map((valor, indice) => {
    const x = (indice / (valores.length - 1)) * 72
    const y = 22 - ((valor - min) / (max - min || 1)) * 20
    return `${x},${y}`
  }).join(" ")
  return <svg width="72" height="24" aria-hidden><polyline points={puntos} fill="none" stroke="#1658B0" strokeWidth="2" /></svg>
}

export function SelloBloqueo({ bloqueado, motivo }: { bloqueado: boolean; motivo: string }) {
  if (!bloqueado) return null
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Antes de cobrar{motivo ? `: ${motivo}` : ""}</span>
}

export function TextoKpi({ nombre, actual, meta, unidad, tipo }: { nombre: string; actual: number | null; meta: number | null; unidad: string; tipo?: string }) {
  return (
    <div className="min-w-40">
      <p className="font-medium">{nombre} {tipo ? <span className="text-xs text-muted-foreground">{TIPO_KPI_LABEL[tipo as "PRINCIPAL"] || tipo}</span> : null}</p>
      <p className="text-xs text-[#3d4a63]">{actual ?? "—"} / {meta ?? "—"} {unidad}</p>
      <BarraMeta actual={actual} meta={meta} />
    </div>
  )
}

export function claseTope(excede: boolean) {
  return excede ? "font-medium text-red-700" : ""
}
