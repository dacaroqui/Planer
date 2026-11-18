"use client"

import { PlusIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react"
import { Elegir } from "@/components/ui/elegir"
import { TEAM_LABEL, TEAMS, type TeamName } from "@/lib/domain"

export function FiltrosPlanner({
  empresas,
  proyectos,
  responsables,
  empresaId,
  proyectoId,
  buscar,
  responsable,
  estado,
  area,
  soloSinAsociar,
  soloVencidas,
  filtrosAbiertos,
  resumen,
  puedeCrear,
  onNueva,
  onEmpresa,
  onProyecto,
  onBuscar,
  onResponsable,
  onEstado,
  onArea,
  onSinAsociar,
  onVencidas,
  onFiltros,
}: {
  empresas: { id: string; name: string }[]
  proyectos: { id: string; name: string; empresaId: string }[]
  responsables: { id: string; name: string }[]
  empresaId: string
  proyectoId: string
  buscar: string
  responsable: string
  estado: string
  area: string
  soloSinAsociar: boolean
  soloVencidas: boolean
  filtrosAbiertos: boolean
  resumen: string
  puedeCrear: boolean
  onNueva: () => void
  onEmpresa: (id: string) => void
  onProyecto: (id: string) => void
  onBuscar: (valor: string) => void
  onResponsable: (id: string) => void
  onEstado: (valor: string) => void
  onArea: (valor: string) => void
  onSinAsociar: (valor: boolean) => void
  onVencidas: (valor: boolean) => void
  onFiltros: () => void
}) {
  const delEspacio = proyectos.filter((item) => item.empresaId === empresaId)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Elegir variante="pill" ariaLabel="Empresa" value={empresaId} onValueChange={onEmpresa} opciones={empresas.map((item) => ({ value: item.id, label: item.name }))} />
        <Elegir className="min-w-72" ariaLabel="Proyecto" value={proyectoId} onValueChange={onProyecto} placeholder="Proyecto" opciones={delEspacio.map((item) => ({ value: item.id, label: item.name }))} />
        <span className="text-sm text-muted-foreground">{resumen}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white p-3 shadow-[0_1px_2px_rgba(21,18,42,0.04)]">
        <label className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <input value={buscar} onChange={(event) => onBuscar(event.target.value)} aria-label="Buscar tarea" placeholder="Buscar tarea..." className="h-11 w-full rounded-[10px] border border-[#D9DEE7] bg-white pr-3 pl-9 text-sm" />
        </label>
        <Elegir ariaLabel="Área" value={area} onValueChange={onArea} placeholder="Área" className="w-44" opciones={[{ value: "", label: "Área" }, ...TEAMS.map((equipo) => ({ value: equipo, label: TEAM_LABEL[equipo as TeamName] }))]} />
        <Elegir ariaLabel="Responsable" value={responsable} onValueChange={onResponsable} placeholder="Responsable" className="w-48" opciones={[{ value: "", label: "Responsable" }, ...responsables.map((item) => ({ value: item.id, label: item.name }))]} />
        <button type="button" aria-expanded={filtrosAbiertos} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm" onClick={onFiltros}>
          <SlidersHorizontalIcon className="size-4" /> Filtros
        </button>
        {puedeCrear ? (
          <button type="button" onClick={onNueva} className="ml-auto inline-flex h-10 items-center gap-1 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white hover:bg-[#222B7C]">
            <PlusIcon className="size-4" /> Nueva tarea
          </button>
        ) : null}
      </div>
      {filtrosAbiertos ? (
        <div className="flex flex-wrap items-center gap-2">
          <Elegir ariaLabel="Estado de la tarea" value={estado} onValueChange={onEstado} className="w-52" opciones={[{ value: "", label: "Todos los estados" }, { value: "PENDIENTE", label: "Pendiente" }, { value: "EN_CURSO", label: "En curso" }, { value: "HECHA", label: "Hecha" }]} />
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
            <input type="checkbox" checked={soloVencidas} onChange={(event) => onVencidas(event.target.checked)} />
            Solo vencidas
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
            <input type="checkbox" checked={soloSinAsociar} onChange={(event) => onSinAsociar(event.target.checked)} />
            Sin asociar
          </label>
        </div>
      ) : null}
    </div>
  )
}
