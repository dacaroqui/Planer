import { describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import { evaluarIngreso } from "@/lib/access"
import { isInternalEmail } from "@/lib/time"
import { safeFilename, assertAllowedFile } from "@/lib/files"
import { easterSunday, holidaysForYear } from "@/lib/holidays"
import { ZONE } from "@/lib/time"
import {
  addBusinessMinutes,
  businessMinutesBetween,
  consumedBusinessMinutes,
  DEFAULT_WINDOWS,
  parseWindows,
  projectDue,
  slaSnapshot,
} from "@/lib/sla"
import { TRANSITIONS, transicionesDelEstado } from "@/lib/workflow"
import { encontrarTransicion, puedeComentar } from "@/lib/permissions"
import { STATUS_LABEL, type Actor } from "@/lib/domain"

const bogota = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toJSDate()

function actor(partial: Partial<Actor> & Pick<Actor, "role">): Actor {
  return {
    id: partial.id ?? partial.role,
    email: partial.email ?? `${partial.role.toLowerCase()}@cifes.edu.co`,
    name: partial.name ?? partial.role,
    role: partial.role,
    team: partial.team ?? null,
    areaId: partial.areaId ?? "area",
    active: partial.active ?? true,
  }
}

describe("RQ-02 dominio institucional", () => {
  it("acepta cuentas del dominio y rechaza externas o disfrazadas", () => {
    expect(isInternalEmail("ana.ejemplo@cifes.edu.co")).toBe(true)
    expect(isInternalEmail("Ana.Ejemplo@CIFES.EDU.CO")).toBe(true)
    expect(isInternalEmail("ana@gmail.com")).toBe(false)
    expect(isInternalEmail("ana@cifes.edu.co.evil.com")).toBe(false)
    expect(isInternalEmail("ana@notcifes.edu.co")).toBe(false)
    expect(evaluarIngreso("externo@gmail.com", null, { aprovisionar: true }).ok).toBe(false)
    expect(evaluarIngreso("ana.ejemplo@cifes.edu.co", { active: false }, { aprovisionar: true }).ok).toBe(false)
    expect(evaluarIngreso("ana.ejemplo@cifes.edu.co", null, { aprovisionar: false }).ok).toBe(false)
    expect(evaluarIngreso("ana.ejemplo@cifes.edu.co", null, { aprovisionar: true }).ok).toBe(true)
  })
})

describe("RQ-10 nombres de archivo", () => {
  it("se queda con el nombre base y rechaza ejecutables", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd")
    expect(safeFilename("pieza final.png")).toBe("pieza final.png")
    expect(() => assertAllowedFile("virus.exe", 10)).toThrow(/no está permitido/)
    expect(assertAllowedFile("brief.pdf", 20)).toBe("pdf")
  })
})

describe("RQ-22 festivos de Colombia", () => {
  it("calcula la pascua y el calendario oficial de 2026", () => {
    expect(easterSunday(2026).toISODate()).toBe("2026-04-05")
    expect(easterSunday(2025).toISODate()).toBe("2025-04-20")
    const dates = holidaysForYear(2026).map((holiday) => holiday.date)
    expect(dates).toEqual([
      "2026-01-01",
      "2026-01-12",
      "2026-03-23",
      "2026-04-02",
      "2026-04-03",
      "2026-05-01",
      "2026-05-18",
      "2026-06-08",
      "2026-06-15",
      "2026-06-29",
      "2026-07-13",
      "2026-07-20",
      "2026-08-07",
      "2026-08-17",
      "2026-10-12",
      "2026-11-02",
      "2026-11-16",
      "2026-12-08",
      "2026-12-25",
    ])
    expect(holidaysForYear(2025).some((holiday) => holiday.name.includes("Chiquinquirá"))).toBe(false)
  })
})

describe("RQ-22 y RQ-23 SLA en horas hábiles", () => {
  it("cruza almuerzo, fin de semana y el festivo del 16 de noviembre de 2026", () => {
    const start = bogota("2026-11-13T17:00:00")
    const due = addBusinessMinutes(start, 180)
    expect(DateTime.fromJSDate(due).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-17 10:00")
    expect(businessMinutesBetween(start, due)).toBeCloseTo(180, 4)
  })

  it("no cuenta la pausa mientras el solicitante debe responder", () => {
    const start = bogota("2026-11-09T08:00:00")
    const pause = { startedAt: bogota("2026-11-10T10:00:00"), endedAt: bogota("2026-11-10T16:00:00") }
    const consumed = consumedBusinessMinutes(start, bogota("2026-11-10T18:00:00"), [pause])
    // Lun 8h + mar 8h - pausa hábil 10-12 y 14-16 = 4h → 12h
    expect(consumed).toBeCloseTo(12 * 60, 4)
    const due = projectDue(start, 8 * 60, [pause], bogota("2026-11-10T18:00:00"))
    // 8h caben el lunes; la pausa del martes no los empuja
    expect(DateTime.fromJSDate(due).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-09 18:00")
    const atPause = projectDue(start, 10 * 60, [pause], bogota("2026-11-10T18:00:00"))
    // 8 h el lunes + 2 h el martes 8:00–10:00, justo cuando empieza la pausa
    expect(DateTime.fromJSDate(atPause).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-10 10:00")
    const pushed = projectDue(start, 12 * 60, [pause], bogota("2026-11-10T18:00:00"))
    // las 2 h que faltan se cuentan después de la pausa, de 16:00 a 18:00
    expect(DateTime.fromJSDate(pushed).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-10 18:00")
  })

  it("marca a tiempo, en riesgo, vencido, pausa, cumplido e incumplido", () => {
    const start = bogota("2026-11-09T08:00:00")
    const base = { startedAt: start, targetMinutes: 8 * 60, pauses: [] as [], riskRatio: 0.75 }
    expect(slaSnapshot({ ...base, now: bogota("2026-11-09T10:00:00") }).state).toBe("A_TIEMPO")
    expect(slaSnapshot({ ...base, now: bogota("2026-11-09T16:00:00") }).state).toBe("EN_RIESGO")
    expect(slaSnapshot({ ...base, now: bogota("2026-11-10T12:00:00") }).state).toBe("VENCIDO")
    const paused = slaSnapshot({
      ...base,
      now: bogota("2026-11-09T11:00:00"),
      pauses: [{ startedAt: bogota("2026-11-09T10:00:00"), endedAt: null }],
    })
    expect(paused.state).toBe("EN_PAUSA")
    expect(slaSnapshot({
      ...base,
      now: bogota("2026-11-12T10:00:00"),
      resolvedAt: bogota("2026-11-09T12:00:00"),
    }).state).toBe("CUMPLIDO")
    expect(slaSnapshot({
      ...base,
      now: bogota("2026-11-12T10:00:00"),
      resolvedAt: bogota("2026-11-10T16:00:00"),
    }).state).toBe("INCUMPLIDO")
    expect(slaSnapshot({ ...base, cancelled: true }).state).toBe("NO_APLICA")
  })

  it("lee franjas configurables", () => {
    expect(parseWindows("09:00-13:00")).toEqual([{ startMin: 540, endMin: 780 }])
    expect(DEFAULT_WINDOWS).toHaveLength(2)
  })
})

describe("RQ-17 RQ-18 RQ-19 RQ-21 flujos y roles", () => {
  const solicitud = {
    id: "r1",
    team: "DESARROLLO" as const,
    status: "RADICADO",
    requesterId: "sol",
    requiresApproval: true,
  }

  it("cubre los dos equipos y solo estados conocidos", () => {
    const estados = new Set(Object.keys(STATUS_LABEL))
    for (const transition of TRANSITIONS) {
      expect(estados.has(transition.from)).toBe(true)
      expect(estados.has(transition.to)).toBe(true)
    }
    expect(transicionesDelEstado("DESARROLLO", "EN_ANALISIS", true).map((item) => item.to)).toContain("PENDIENTE_APROBACION")
    expect(transicionesDelEstado("DESARROLLO", "EN_ANALISIS", true).map((item) => item.to)).not.toContain("EN_DESARROLLO")
    expect(transicionesDelEstado("DESARROLLO", "EN_ANALISIS", false).map((item) => item.to)).toContain("EN_DESARROLLO")
    expect(transicionesDelEstado("MARKETING", "EN_REVISION", false).map((item) => item.to)).toContain("EN_PRODUCCION")
    expect(transicionesDelEstado("MARKETING", "RADICADO", false).map((item) => item.to)).not.toContain("EN_DESARROLLO")
  })

  it("impide que el solicitante ejecute y que otro equipo apruebe", () => {
    const solicitante = actor({ id: "sol", role: "SOLICITANTE" })
    const agente = actor({ id: "ag", role: "AGENTE", team: "DESARROLLO" })
    const marketing = actor({ id: "mk", role: "AGENTE", team: "MARKETING" })
    const lider = actor({ id: "ld", role: "LIDER", team: "DESARROLLO" })
    const otroLider = actor({ id: "lm", role: "LIDER", team: "MARKETING" })
    const observador = actor({ role: "OBSERVADOR" })

    expect(encontrarTransicion(solicitante, solicitud, "EN_DESARROLLO")).toBeNull()
    expect(encontrarTransicion(solicitante, solicitud, "CANCELADO")?.label).toBe("Cancelar")
    expect(encontrarTransicion(actor({ id: "otro", role: "SOLICITANTE" }), solicitud, "CANCELADO")).toBeNull()
    expect(encontrarTransicion(agente, solicitud, "EN_ANALISIS")?.to).toBe("EN_ANALISIS")
    expect(encontrarTransicion(marketing, solicitud, "EN_ANALISIS")).toBeNull()
    expect(encontrarTransicion(observador, solicitud, "EN_ANALISIS")).toBeNull()

    const enAprobacion = { ...solicitud, status: "PENDIENTE_APROBACION" }
    expect(encontrarTransicion(lider, enAprobacion, "APROBADO")?.label).toBe("Aprobar")
    expect(encontrarTransicion(lider, enAprobacion, "DEVUELTO")?.requiresComment).toBe(true)
    expect(encontrarTransicion(agente, enAprobacion, "APROBADO")).toBeNull()
    expect(encontrarTransicion(otroLider, enAprobacion, "APROBADO")).toBeNull()
    expect(encontrarTransicion(solicitante, enAprobacion, "DEVUELTO")).toBeNull()
    expect(puedeComentar(observador, solicitud, false)).toBe(false)
    expect(puedeComentar(solicitante, solicitud, true)).toBe(false)
    expect(puedeComentar(agente, solicitud, true)).toBe(true)
  })
})
