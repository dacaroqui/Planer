"use client"

import { useRouter } from "next/navigation"
import { XIcon } from "lucide-react"
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
        <select aria-label="Periodo" className={selecto} value={filtros.periodo} onChange={(event) => elegirPeriodo(event.target.value as FiltrosRendimiento["periodo"])}>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
          <option value="anio">Año</option>
          <option value="rango">Rango</option>
        </select>
        {ocultarPersona ? null : (
          <select aria-label="Persona" className={selecto} value="" onChange={(event) => elegirPersona(event.target.value)}>
            <option value="">Persona</option>
            {opciones.personas.filter((item) => !filtros.personas.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        )}
        <select aria-label="Área" className={selecto} value={filtros.areaId ?? ""} onChange={(event) => ir({ areaId: event.target.value || undefined })}>
          <option value="">Área</option>
          {opciones.areas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
        <select aria-label="Espacio" className={selecto} value={filtros.empresaId ?? ""} onChange={(event) => ir({ empresaId: event.target.value || undefined })}>
          <option value="">Espacio</option>
          {opciones.empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
        <select aria-label="Equipo" className={selecto} value={filtros.equipo ?? ""} onChange={(event) => ir({ equipo: (event.target.value || undefined) as FiltrosRendimiento["equipo"] })}>
          <option value="">Equipo</option>
          {equipos.map((item) => <option key={item} value={item}>{TEAM_LABEL[item]}</option>)}
        </select>
        <select aria-label="Tipo" className={selecto} value={filtros.tipoId ?? ""} onChange={(event) => ir({ tipoId: event.target.value || undefined })}>
          <option value="">Tipo</option>
          {tipos.map((item) => <option key={item.id} value={item.id}>{TEAM_LABEL[item.equipo]} · {item.nombre}</option>)}
        </select>
        <select aria-label="Prioridad" className={selecto} value={filtros.prioridad ?? ""} onChange={(event) => ir({ prioridad: (event.target.value || undefined) as FiltrosRendimiento["prioridad"] })}>
          <option value="">Prioridad</option>
          <option value="BAJA">Baja</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
          <option value="CRITICA">Crítica</option>
        </select>
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
