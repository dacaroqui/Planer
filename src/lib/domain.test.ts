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
import { ESTADOS_OFICIALES, TRANSICIONES_OFICIALES } from "@/lib/flujo-oficial"
import { encontrarTransicion, puedeComentar, puedeVer } from "@/lib/permissions"
import type { Actor } from "@/lib/domain"

const bogota = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toJSDate()

function actor(partial: Partial<Actor> & Pick<Actor, "role">): Actor {
  const memberships = partial.memberships ?? (
    partial.team && (partial.role === "AGENTE" || partial.role === "LIDER" || partial.role === "OBSERVADOR")
      ? [{ team: partial.team, role: partial.role }]
      : []
  )
  return {
    id: partial.id ?? partial.role,
    email: partial.email ?? `${partial.role.toLowerCase()}@cifes.edu.co`,
    name: partial.name ?? partial.role,
    role: partial.role,
    team: partial.team ?? null,
    areaId: partial.areaId ?? "area",
    active: partial.active ?? true,
    isAdmin: partial.isAdmin ?? partial.role === "ADMINISTRADOR",
    memberships,
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
    expect(() => assertAllowedFile("paquete.zip", 10)).toThrow(/no está permitido/)
    expect(assertAllowedFile("brief.pdf", 20)).toBe("pdf")
    expect(assertAllowedFile("notas.txt", 20)).toBe("txt")
    expect(assertAllowedFile("lista.csv", 20)).toBe("csv")
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

describe("RQ-10 RQ-21 flujo oficial y visibilidad", () => {
  const solicitud = {
    id: "r1",
    team: "DESARROLLO" as const,
    status: "NUEVO",
    requesterId: "sol",
    assigneeId: null as string | null,
  }

  it("cubre los estados oficiales de las dos áreas", () => {
    const claves = new Set(ESTADOS_OFICIALES.map((estado) => `${estado.team}:${estado.key}`))
    for (const transition of TRANSICIONES_OFICIALES) {
      for (const origen of transition.from) expect(claves.has(`${transition.team}:${origen}`)).toBe(true)
      expect(claves.has(`${transition.team}:${transition.to}`)).toBe(true)
    }
    expect(TRANSICIONES_OFICIALES.some((item) => item.team === "MARKETING" && item.to === "EN_DESARROLLO")).toBe(false)
  })

  it("impide que el solicitante ejecute y que otro equipo apruebe", () => {
    const solicitante = actor({ id: "sol", role: "SOLICITANTE" })
    const agente = actor({ id: "ag", role: "AGENTE", team: "DESARROLLO" })
    const marketing = actor({ id: "mk", role: "AGENTE", team: "MARKETING" })
    const lider = actor({ id: "ld", role: "LIDER", team: "DESARROLLO" })
    const otroLider = actor({ id: "lm", role: "LIDER", team: "MARKETING" })
    const observador = actor({ id: "ob", role: "OBSERVADOR", team: "DESARROLLO" })

    expect(encontrarTransicion(solicitante, solicitud, "Iniciar análisis")).toBeNull()
    expect(encontrarTransicion(solicitante, solicitud, "Cancelar")?.name).toBe("Cancelar")
    expect(encontrarTransicion(actor({ id: "otro", role: "SOLICITANTE" }), solicitud, "Cancelar")).toBeNull()
    expect(encontrarTransicion(lider, solicitud, "Iniciar análisis")?.to).toBe("EN_ANALISIS")
    expect(encontrarTransicion(agente, solicitud, "Iniciar análisis")).toBeNull()
    expect(encontrarTransicion(marketing, solicitud, "Iniciar análisis")).toBeNull()
    expect(encontrarTransicion(observador, solicitud, "Iniciar análisis")).toBeNull()
    expect(puedeVer(marketing, solicitud)).toBe(false)
    expect(puedeVer(solicitante, solicitud)).toBe(true)
    expect(encontrarTransicion(otroLider, { ...solicitud, status: "EN_ANALISIS" }, "Aprobar")).toBeNull()
    expect(puedeComentar(observador, solicitud, false)).toBe(false)
    expect(puedeComentar(solicitante, solicitud, true)).toBe(false)
    expect(puedeComentar(agente, solicitud, true)).toBe(true)
  })
})
