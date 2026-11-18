import { describe, expect, it } from "vitest"
import { PREFIJO_EQUIPO, TEAM_LABEL, TEAMS, estadoInicial } from "@/lib/domain"
import { ESTADOS_OFICIALES, TIPOS_OFICIALES, TRANSICIONES_OFICIALES } from "@/lib/flujo-oficial"

const CLAVES = ["NUEVO", "EN_ANALISIS", "EN_ESPERA", "EN_CURSO", "EN_REVISION", "HECHO", "CANCELADO"]

describe("Administración y Growth", () => {
  it("entran al catálogo con prefijo, tarjeta y flujo estándar", () => {
    expect(TEAMS).toEqual(expect.arrayContaining(["ADMINISTRACION", "GROWTH"]))
    expect(TEAM_LABEL.ADMINISTRACION).toBe("Administración")
    expect(TEAM_LABEL.GROWTH).toBe("Growth")
    expect(PREFIJO_EQUIPO.ADMINISTRACION).toBe("ADM")
    expect(PREFIJO_EQUIPO.GROWTH).toBe("GRO")
    for (const team of ["ADMINISTRACION", "GROWTH"] as const) {
      expect(estadoInicial(team)).toBe("NUEVO")
      expect(ESTADOS_OFICIALES.filter((estado) => estado.team === team).map((estado) => estado.key)).toEqual(CLAVES)
      expect(TIPOS_OFICIALES.filter((tipo) => tipo.team === team).length).toBeGreaterThanOrEqual(4)
      expect(TRANSICIONES_OFICIALES.some((paso) => paso.team === team && paso.to === "HECHO")).toBe(true)
      expect(TRANSICIONES_OFICIALES.some((paso) => paso.team === team && paso.to === "CANCELADO")).toBe(true)
    }
  })
})
