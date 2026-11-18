"use client"

import { useRouter } from "next/navigation"
import { XIcon } from "lucide-react"
import { Elegir } from "@/components/ui/elegir"
import { TEAM_LABEL, type TeamName } from "@/lib/domain"
import { DateTime } from "luxon"
import {
  chipsRendimiento,
  filtrosLimpios,
  hrefRendimiento,
  textoPeriodo,
  type AlcanceRendimiento,
  type FiltrosRendimiento,
  type OpcionesRendimiento,
  type Rango,
} from "@/lib/rendimiento"
import { ZONE } from "@/lib/time"

const selecto = "h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#15122A]"

export function FiltrosRendimientoForm({
  filtros,
  opciones,
  periodo,
  action,
  alcance,
  ocultarPersona = false,
}: {
  filtros: FiltrosRendimiento
  opciones: OpcionesRendimiento
  periodo: Rango
  action: string
  alcance: AlcanceRendimiento
  ocultarPersona?: boolean
}) {
  const router = useRouter()
  const equipos: TeamName[] = alcance.tipo === "equipos" ? alcance.teams : ["DESARROLLO", "MARKETING"]
  const tipos = opciones.tipos.filter((item) => !filtros.equipo || item.equipo === filtros.equipo)
  const nombres = {
    persona: new Map(opciones.personas.map((item) => [item.id, item.nombre])),
    area: new Map(opciones.areas.map((item) => [item.id, item.nombre])),
    empresa: new Map(opciones.empresas.map((item) => [item.id, item.nombre])),
    tipo: new Map(opciones.tipos.map((item) => [item.id, item.nombre])),
  }
  const chips = chipsRendimiento(filtros, nombres).filter((chip) => ocultarPersona ? !chip.id.startsWith("persona-") : true)

  function ir(patch: Partial<FiltrosRendimiento>) {
    router.push(hrefRendimiento(action, filtros, patch))
  }

  function elegirPeriodo(valor: FiltrosRendimiento["periodo"]) {
    if (valor !== "rango") {
      ir({ periodo: valor, desde: undefined, hasta: undefined })
      return
    }
    const desde = DateTime.fromJSDate(periodo.start, { zone: ZONE }).toISODate() ?? ""
    const hasta = DateTime.fromJSDate(periodo.end, { zone: ZONE }).minus({ days: 1 }).toISODate() ?? ""
    ir({ periodo: "rango", desde, hasta })
  }

  function elegirPersona(id: string) {
    if (!id || filtros.personas.includes(id)) return
    ir({ personas: [...filtros.personas, id] })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Elegir className="w-36" ariaLabel="Periodo" value={filtros.periodo} onValueChange={(valor) => elegirPeriodo(valor as FiltrosRendimiento["periodo"])} opciones={[{ value: "semana", label: "Semana" }, { value: "mes", label: "Mes" }, { value: "anio", label: "Año" }, { value: "rango", label: "Rango" }]} />
        {ocultarPersona ? null : (
          <Elegir className="w-44" ariaLabel="Persona" value="" onValueChange={elegirPersona} placeholder="Persona" opciones={[{ value: "", label: "Persona" }, ...opciones.personas.filter((item) => !filtros.personas.includes(item.id)).map((item) => ({ value: item.id, label: item.nombre }))]} />
        )}
        <Elegir className="w-40" ariaLabel="Área" value={filtros.areaId ?? ""} onValueChange={(valor) => ir({ areaId: valor || undefined })} placeholder="Área" opciones={[{ value: "", label: "Área" }, ...opciones.areas.map((item) => ({ value: item.id, label: item.nombre }))]} />
        <Elegir className="w-40" ariaLabel="Espacio" value={filtros.empresaId ?? ""} onValueChange={(valor) => ir({ empresaId: valor || undefined })} placeholder="Espacio" opciones={[{ value: "", label: "Espacio" }, ...opciones.empresas.map((item) => ({ value: item.id, label: item.nombre }))]} />
        <Elegir className="w-40" ariaLabel="Equipo" value={filtros.equipo ?? ""} onValueChange={(valor) => ir({ equipo: (valor || undefined) as FiltrosRendimiento["equipo"] })} placeholder="Equipo" opciones={[{ value: "", label: "Equipo" }, ...equipos.map((item) => ({ value: item, label: TEAM_LABEL[item] }))]} />
        <Elegir className="w-52" ariaLabel="Tipo" value={filtros.tipoId ?? ""} onValueChange={(valor) => ir({ tipoId: valor || undefined })} placeholder="Tipo" opciones={[{ value: "", label: "Tipo" }, ...tipos.map((item) => ({ value: item.id, label: `${TEAM_LABEL[item.equipo]} · ${item.nombre}` }))]} />
        <Elegir className="w-40" ariaLabel="Prioridad" value={filtros.prioridad ?? ""} onValueChange={(valor) => ir({ prioridad: (valor || undefined) as FiltrosRendimiento["prioridad"] })} placeholder="Prioridad" opciones={[{ value: "", label: "Prioridad" }, { value: "BAJA", label: "Baja" }, { value: "MEDIA", label: "Media" }, { value: "ALTA", label: "Alta" }, { value: "CRITICA", label: "Crítica" }]} />
      </div>
      {filtros.periodo === "rango" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Desde
            <input className={selecto} type="date" lang="es-CO" aria-label="Desde" value={filtros.desde ?? ""} onChange={(event) => {
              const desde = event.target.value || filtros.hasta
              const hasta = filtros.hasta || event.target.value
              if (desde && hasta) ir({ periodo: "rango", desde, hasta })
            }} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Hasta
            <input className={selecto} type="date" lang="es-CO" aria-label="Hasta" value={filtros.hasta ?? ""} onChange={(event) => {
              const hasta = event.target.value || filtros.desde
              const desde = filtros.desde || event.target.value
              if (desde && hasta) ir({ periodo: "rango", desde, hasta })
            }} />
          </label>
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button key={chip.id} type="button" onClick={() => ir(chip.patch)} className="inline-flex items-center gap-1 rounded-full border border-[#D7E3F4] bg-white px-2.5 py-1 text-xs text-[#222B7C]">
              {chip.texto} <XIcon className="size-3" />
            </button>
          ))}
          <button type="button" onClick={() => ir(filtrosLimpios())} className="text-xs font-medium text-[#1658B0] hover:underline">Limpiar</button>
        </div>
      ) : null}
      <p className="text-sm text-[#222B7C]">{textoPeriodo(periodo)}. Las fechas del rango se leen en hora de Colombia.</p>
    </div>
  )
}
