import { DateTime } from "luxon"
import { ZONE } from "@/lib/time"

export type Holiday = { date: string; name: string }

const cache = new Map<number, Holiday[]>()

/** Domingo de Pascua, algoritmo gregoriano anónimo. */
export function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return DateTime.fromObject({ year, month, day }, { zone: ZONE })
}

function fixed(year: number, month: number, day: number) {
  return DateTime.fromObject({ year, month, day }, { zone: ZONE })
}

/** Ley 51 de 1983: si no cae lunes, se corre al lunes siguiente. */
export function emiliani(date: DateTime) {
  if (date.weekday === 1) return date
  return date.plus({ days: 8 - date.weekday })
}

export function holidaysForYear(year: number): Holiday[] {
  const cached = cache.get(year)
  if (cached) return cached
  const easter = easterSunday(year)
  const entries: Array<[DateTime, string]> = [
    [fixed(year, 1, 1), "Año Nuevo"],
    [emiliani(fixed(year, 1, 6)), "Reyes Magos"],
    [emiliani(fixed(year, 3, 19)), "Día de San José"],
    [easter.minus({ days: 3 }), "Jueves Santo"],
    [easter.minus({ days: 2 }), "Viernes Santo"],
    [fixed(year, 5, 1), "Día del Trabajo"],
    [emiliani(easter.plus({ days: 39 })), "Ascensión del Señor"],
    [emiliani(easter.plus({ days: 60 })), "Corpus Christi"],
    [emiliani(easter.plus({ days: 68 })), "Sagrado Corazón"],
    [emiliani(fixed(year, 6, 29)), "San Pedro y San Pablo"],
    [fixed(year, 7, 20), "Independencia de Colombia"],
    [fixed(year, 8, 7), "Batalla de Boyacá"],
    [emiliani(fixed(year, 8, 15)), "Asunción de la Virgen"],
    [emiliani(fixed(year, 10, 12)), "Día de la Diversidad Étnica y Cultural"],
    [emiliani(fixed(year, 11, 1)), "Todos los Santos"],
    [emiliani(fixed(year, 11, 11)), "Independencia de Cartagena"],
    [fixed(year, 12, 8), "Inmaculada Concepción"],
    [fixed(year, 12, 25), "Navidad"],
  ]
  if (year >= 2026) {
    entries.push([
      emiliani(fixed(year, 7, 9)),
      "Nuestra Señora del Rosario de Chiquinquirá",
    ])
  }
  const holidays = entries
    .map(([date, name]) => ({ date: date.toISODate()!, name }))
    .sort((a, b) => a.date.localeCompare(b.date))
  cache.set(year, holidays)
  return holidays
}

export function isHoliday(day: DateTime) {
  const iso = day.setZone(ZONE).toISODate()
  return holidaysForYear(day.year).some((holiday) => holiday.date === iso)
}

export function isBusinessDay(day: DateTime) {
  const zoned = day.setZone(ZONE).startOf("day")
  return zoned.weekday <= 5 && !isHoliday(zoned)
}
