import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { diasEntre, excedeTope, mensajeCupo, puedeProponerMeta, sumarPiezas } from "@/lib/objetivos"

describe("objetivos y KPIs", () => {
  it("suma horas y costos de la actividad al objetivo", () => {
    const proyecto = sumarPiezas([{ horas: 4, costo: 10 }, { horas: 6, costo: 0 }])
    const objetivo = sumarPiezas([proyecto, { horas: 2, costo: 5 }])
    expect(proyecto).toEqual({ horas: 10, costo: 10 })
    expect(objetivo).toEqual({ horas: 12, costo: 15 })
    expect(excedeTope(15, 10)).toBe(true)
    expect(excedeTope(15, null)).toBe(false)
    expect(diasEntre("2026-11-01", "2026-11-08")).toBe("7")
  })

  it("permite un KPI principal y hasta cuatro de apoyo", () => {
    const base = [{ tipo: "PRINCIPAL" as const }, { tipo: "APOYO" as const }, { tipo: "APOYO" as const }, { tipo: "APOYO" as const }, { tipo: "APOYO" as const }]
    expect(mensajeCupo(base, "APOYO")).toBe("Cada persona tiene como máximo cuatro KPIs de apoyo.")
    expect(mensajeCupo([{ tipo: "PRINCIPAL" }], "PRINCIPAL")).toBe("Cada persona tiene un solo KPI principal.")
    expect(mensajeCupo([{ tipo: "APOYO" }], "PRINCIPAL")).toBeNull()
    expect(puedeProponerMeta(2)).toBe(false)
    expect(puedeProponerMeta(3)).toBe(true)
  })

  it("la migración solo agrega estructuras", () => {
    const sql = readFileSync("prisma/migrations/20261125220000_objetivos_kpis/migration.sql", "utf8")
    expect(sql).toContain('CREATE TABLE "Objetivo"')
    expect(sql).toContain('CREATE TABLE "Kpi"')
    expect(sql).toContain('CREATE TABLE "KpiMedicion"')
    expect(sql).toContain('ADD COLUMN "objetivoId"')
    expect(sql.toLowerCase()).not.toContain("drop table")
    expect(sql.toLowerCase()).not.toContain("delete from")
  })
})
