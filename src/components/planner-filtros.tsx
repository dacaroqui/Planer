"use client"

import { PlusIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react"

const selecto = "h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"

export function FiltrosPlanner({
  empresas,
  proyectos,
  responsables,
  empresaId,
  proyectoId,
  buscar,
  responsable,
  estado,
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
  onVencidas: (valor: boolean) => void
  onFiltros: () => void
}) {
  const delEspacio = proyectos.filter((item) => item.empresaId === empresaId)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Empresa">
          {empresas.map((empresa) => {
            const activa = empresa.id === empresaId
            return (
              <button
                key={empresa.id}
                type="button"
                aria-pressed={activa}
                className={activa ? "rounded-full bg-[#E7F0FB] px-3 py-1.5 text-sm font-medium text-[#1658B0]" : "rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-sm"}
                onClick={() => onEmpresa(empresa.id)}
              >
                {empresa.name}
              </button>
            )
          })}
        </div>
        <select aria-label="Proyecto" className={`${selecto} min-w-56`} value={proyectoId} onChange={(event) => onProyecto(event.target.value)}>
          {delEspacio.length === 0 ? <option value="">Sin proyectos</option> : null}
          {delEspacio.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{resumen}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white p-3">
        <label className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <input value={buscar} onChange={(event) => onBuscar(event.target.value)} aria-label="Buscar tarea" placeholder="Buscar tarea..." className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white pr-3 pl-9 text-sm" />
        </label>
        <select aria-label="Responsable" className={selecto} value={responsable} onChange={(event) => onResponsable(event.target.value)}>
          <option value="">Responsable</option>
          {responsables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
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
          <select aria-label="Estado de la tarea" className={selecto} value={estado} onChange={(event) => onEstado(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_CURSO">En curso</option>
            <option value="HECHA">Hecha</option>
          </select>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
            <input type="checkbox" checked={soloVencidas} onChange={(event) => onVencidas(event.target.checked)} />
            Solo vencidas
          </label>
        </div>
      ) : null}
    </div>
  )
}
