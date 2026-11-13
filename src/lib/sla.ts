import { DateTime } from "luxon"
import { isBusinessDay } from "@/lib/holidays"
import { ZONE } from "@/lib/time"
import type { SlaState } from "@/lib/domain"

export type BusinessWindow = { startMin: number; endMin: number }

export const DEFAULT_WINDOWS: BusinessWindow[] = [
  { startMin: 8 * 60, endMin: 12 * 60 },
  { startMin: 14 * 60, endMin: 18 * 60 },
]

export type PauseInterval = { startedAt: Date; endedAt: Date | null }

export type SlaSnapshot = {
  state: SlaState
  consumedMinutes: number
  remainingMinutes: number
  dueAt: Date | null
  ratio: number
}

export function parseWindows(value: string): BusinessWindow[] {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) throw new Error("No hay franjas horarias.")
  return parts.map((part) => {
    const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(part)
    if (!match) throw new Error(`Franja inválida: ${part}`)
    const startMin = Number(match[1]) * 60 + Number(match[2])
    const endMin = Number(match[3]) * 60 + Number(match[4])
    if (endMin <= startMin || endMin > 24 * 60) throw new Error(`Franja inválida: ${part}`)
    return { startMin, endMin }
  })
}

export function windowsFromEnv() {
  const raw = process.env.BUSINESS_WINDOWS
  if (!raw) return DEFAULT_WINDOWS
  return parseWindows(raw)
}

export function describeWindows(windows: BusinessWindow[] = windowsFromEnv()) {
  const label = windows
    .map((window) => `${clock(window.startMin)}–${clock(window.endMin)}`)
    .join(" y ")
  return `Lunes a viernes, ${label}, hora de Colombia, sin festivos nacionales`
}

function clock(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

function zoned(date: Date) {
  return DateTime.fromJSDate(date, { zone: ZONE })
}

type Slot = { start: DateTime; end: DateTime }

function* slotsFrom(cursor: DateTime, windows: BusinessWindow[]) {
  let day = cursor.setZone(ZONE).startOf("day")
  for (let i = 0; i < 800; i += 1) {
    if (isBusinessDay(day)) {
      for (const window of windows) {
        const start = day.plus({ minutes: window.startMin })
        const end = day.plus({ minutes: window.endMin })
        if (end <= cursor) continue
        yield { start, end } satisfies Slot
      }
    }
    day = day.plus({ days: 1 })
  }
}

function firstSlot(cursor: DateTime, windows: BusinessWindow[]) {
  for (const slot of slotsFrom(cursor, windows)) return slot
  throw new Error("No hay jornada hábil en el horizonte de un año.")
}

export function addBusinessMinutes(start: Date, minutes: number, windows = DEFAULT_WINDOWS) {
  if (minutes <= 0) return new Date(start)
  let cursor = zoned(start)
  let left = minutes
  for (const slot of slotsFrom(cursor, windows)) {
    const from = cursor > slot.start ? cursor : slot.start
    if (from >= slot.end) continue
    const available = slot.end.diff(from, "minutes").minutes
    if (available + 1e-6 >= left) return from.plus({ minutes: left }).toJSDate()
    left -= available
    cursor = slot.end
  }
  throw new Error("No se pudo proyectar el vencimiento del SLA.")
}

export function businessMinutesBetween(start: Date, end: Date, windows = DEFAULT_WINDOWS) {
  if (end.getTime() <= start.getTime()) return 0
  const finish = zoned(end)
  let cursor = zoned(start)
  let total = 0
  for (const slot of slotsFrom(cursor, windows)) {
    if (slot.start >= finish) break
    const from = cursor > slot.start ? cursor : slot.start
    const to = finish < slot.end ? finish : slot.end
    if (to > from) total += to.diff(from, "minutes").minutes
    cursor = slot.end
    if (cursor >= finish) break
  }
  return total
}

export function consumedBusinessMinutes(
  start: Date,
  end: Date,
  pauses: PauseInterval[],
  windows = DEFAULT_WINDOWS,
) {
  const gross = businessMinutesBetween(start, end, windows)
  let paused = 0
  for (const pause of pauses) {
    const pauseEnd = pause.endedAt ?? end
    const from = new Date(Math.max(start.getTime(), pause.startedAt.getTime()))
    const to = new Date(Math.min(end.getTime(), pauseEnd.getTime()))
    if (to > from) paused += businessMinutesBetween(from, to, windows)
  }
  return Math.max(0, gross - paused)
}

export function projectDue(
  start: Date,
  targetMinutes: number,
  pauses: PauseInterval[],
  now: Date,
  windows = DEFAULT_WINDOWS,
) {
  if (targetMinutes <= 0) return new Date(start)
  let cursor = zoned(start)
  const nowZ = zoned(now)
  let left = targetMinutes
  const normalized = pauses
    .map((pause) => ({
      start: zoned(pause.startedAt),
      end: pause.endedAt ? zoned(pause.endedAt) : null,
    }))
    .sort((a, b) => a.start.toMillis() - b.start.toMillis())

  for (let guard = 0; guard < 8000 && left > 1e-6; guard += 1) {
    const covering = normalized.find(
      (pause) => pause.start <= cursor && (pause.end === null || pause.end > cursor),
    )
    if (covering) {
      if (covering.end === null) {
        if (nowZ > cursor) {
          cursor = nowZ
          continue
        }
      } else {
        cursor = covering.end
        continue
      }
    }

    const slot = firstSlot(cursor, windows)
    const from = cursor > slot.start ? cursor : slot.start
    let slotEnd = slot.end
    const upcoming = normalized.find((pause) => pause.start > from && pause.start < slotEnd)
    if (upcoming) slotEnd = upcoming.start
    if (from >= slotEnd) {
      cursor = slotEnd > cursor ? slotEnd : cursor.plus({ minutes: 1 })
      continue
    }
    const available = slotEnd.diff(from, "minutes").minutes
    if (available + 1e-6 >= left) return from.plus({ minutes: left }).toJSDate()
    left -= available
    cursor = slotEnd
  }
  throw new Error("No se pudo proyectar el vencimiento del SLA.")
}

export function slaSnapshot(
  input: {
    startedAt: Date
    targetMinutes: number
    pauses: PauseInterval[]
    now?: Date
    resolvedAt?: Date | null
    cancelled?: boolean
    riskRatio?: number
  },
  windows = DEFAULT_WINDOWS,
): SlaSnapshot {
  const now = input.now ?? new Date()
  const riskRatio = input.riskRatio ?? Number(process.env.SLA_RISK_RATIO || 0.75)
  if (input.cancelled) {
    return { state: "NO_APLICA", consumedMinutes: 0, remainingMinutes: 0, dueAt: null, ratio: 0 }
  }
  const clockEnd = input.resolvedAt ?? now
  const consumed = consumedBusinessMinutes(input.startedAt, clockEnd, input.pauses, windows)
  const remaining = input.targetMinutes - consumed
  const ratio = input.targetMinutes <= 0 ? 1 : consumed / input.targetMinutes
  const dueAt = projectDue(input.startedAt, input.targetMinutes, input.pauses, now, windows)
  const openPause = input.pauses.some((pause) => pause.endedAt === null) && !input.resolvedAt

  let state: SlaState
  if (input.resolvedAt) state = consumed <= input.targetMinutes + 0.05 ? "CUMPLIDO" : "INCUMPLIDO"
  else if (remaining <= 0.05) state = "VENCIDO"
  else if (openPause) state = "EN_PAUSA"
  else if (ratio + 1e-9 >= riskRatio) state = "EN_RIESGO"
  else state = "A_TIEMPO"

  return {
    state,
    consumedMinutes: consumed,
    remainingMinutes: Math.max(0, remaining),
    dueAt,
    ratio,
  }
}

export function formatDuration(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes))
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  if (hours <= 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}
