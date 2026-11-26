export type ActividadPieza = { hecha: boolean }

export type CumplimientoFecha = "a_tiempo" | "en_riesgo" | "vencido" | "sin_fecha"

/** Porcentaje de un entregable: actividades hechas sobre el total. Vacío es 0. */
export function porcentajeEntregable(actividades: ActividadPieza[]) {
  if (actividades.length === 0) return 0
  return Math.round((actividades.filter((item) => item.hecha).length / actividades.length) * 100)
}

/**
 * Porcentaje del proyecto, ponderado por actividades (no es el promedio simple
 * de los porcentajes de cada entregable). Cuenta todas las actividades del
 * proyecto, incluidas las del cubo «Sin entregable».
 */
export function porcentajeProyecto(actividades: ActividadPieza[]) {
  return porcentajeEntregable(actividades)
}

export function cumplimientoFecha(fecha: string | null, porcentaje: number, hoy: string): CumplimientoFecha {
  if (!fecha) return "sin_fecha"
  if (porcentaje >= 100) return "a_tiempo"
  const dias = Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000)
  if (!Number.isFinite(dias)) return "sin_fecha"
  if (dias < 0) return "vencido"
  if (dias <= 3) return "en_riesgo"
  return "a_tiempo"
}

export const TEXTO_CUMPLIMIENTO = "El cumplimiento general es el porcentaje de actividades hechas sobre el total del corte. Cada actividad cuenta una vez, también las que están sin entregable. No es el promedio de los proyectos. Las horas suman cada actividad y cada subtarea una sola vez."

export const CUMPLIMIENTO_LABEL: Record<CumplimientoFecha, string> = {
  a_tiempo: "A tiempo",
  en_riesgo: "En riesgo",
  vencido: "Vencido",
  sin_fecha: "Sin fecha",
}
