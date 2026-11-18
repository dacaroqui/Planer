import { DateTime } from "luxon"
import { addBusinessMinutes } from "@/lib/sla"
import { ZONE } from "@/lib/time"

export const MENSAJE_FECHA_ANTERIOR = "La fecha no puede ser anterior a hoy"

const MINUTOS_POR_PRIORIDAD: Record<string, number> = {
  CRITICA: 2 * 8 * 60,
  ALTA: 3 * 8 * 60,
  MEDIA: 5 * 8 * 60,
  BAJA: 10 * 8 * 60,
}

export function hoyBogota(ahora = new Date()) {
  return DateTime.fromJSDate(ahora, { zone: ZONE }).toISODate() ?? ""
}

export function minutosDeEntrega(prioridad: string, minutosTipo?: number | null) {
  if (minutosTipo && minutosTipo > 0) return minutosTipo
  return MINUTOS_POR_PRIORIDAD[prioridad] ?? MINUTOS_POR_PRIORIDAD.MEDIA
}

export function fechaEntregaRecomendada(input: { ahora?: Date; prioridad: string; minutosTipo?: number | null }) {
  const ahora = input.ahora ?? new Date()
  const vence = addBusinessMinutes(ahora, minutosDeEntrega(input.prioridad, input.minutosTipo))
  return DateTime.fromJSDate(vence, { zone: ZONE }).toISODate() ?? hoyBogota(ahora)
}

export function textoFechaIso(iso: string) {
  const [anio, mes, dia] = iso.split("-")
  if (!anio || !mes || !dia) return iso
  return `${dia}/${mes}/${anio}`
}

export function errorFechaEntrega(valor: string, ahora = new Date()) {
  if (!valor.trim()) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "La fecha de entrega esperada no es válida."
  if (valor < hoyBogota(ahora)) return MENSAJE_FECHA_ANTERIOR
  return null
}

export type PoliticaEntrega = {
  team: string
  typeId: string | null
  priority: string
  resolutionMinutes: number
}

export function minutosDePolitica(politicas: PoliticaEntrega[], team: string, typeId: string, prioridad: string) {
  const especifica = politicas.find((item) => item.team === team && item.typeId === typeId && item.priority === prioridad && typeId)
  const general = politicas.find((item) => item.team === team && !item.typeId && item.priority === prioridad)
  return especifica?.resolutionMinutes ?? general?.resolutionMinutes ?? null
}

export type DatosRadicar = {
  team: string
  title: string
  description: string
  typeId: string
  extra: string
  steps: string
  channels: string
  priority: string
  justification: string
  desiredDate: string
  declares: boolean
  ahora?: Date
}

export function erroresPaso(paso: 1 | 2 | 3, datos: DatosRadicar) {
  const errores: Record<string, string> = {}
  if (paso === 1) {
    if (!datos.team) errores.team = "Seleccione el equipo antes de continuar."
    return errores
  }
  if (paso === 2) {
    const titulo = datos.title.trim()
    if (titulo.length < 5 || titulo.length > 120) errores.title = "El título debe tener entre 5 y 120 caracteres."
    if (datos.description.trim().length < 20) errores.description = "La descripción debe tener al menos 20 caracteres."
    if (!datos.typeId) errores.typeId = "Elija un tipo de requerimiento."
    if (datos.extra === "pasos" && datos.steps.trim().length < 8) errores.steps = "Describa los pasos para reproducir el error, con datos de prueba."
    if (datos.extra === "canal" && datos.channels.trim().length < 2) errores.channels = "Indique el canal."
    if (datos.priority === "CRITICA" && datos.justification.trim().length < 8) {
      errores.justification = "Si la prioridad es crítica, explique la justificación y qué pasa si no se hace."
    }
    const fecha = errorFechaEntrega(datos.desiredDate, datos.ahora)
    if (fecha) errores.desiredDate = fecha
    return errores
  }
  if (!datos.declares) errores.declares = "Confirme que este requerimiento no contiene datos personales sensibles."
  return errores
}
