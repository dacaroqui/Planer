import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { cumplimientoFecha, porcentajeEntregable, porcentajeProyecto } from "@/lib/entregables"

describe("entregables", () => {
  it("pondera el proyecto por actividades y no por el promedio de los porcentajes", () => {
    expect(porcentajeEntregable([{ hecha: true }, { hecha: false }])).toBe(50)
    expect(porcentajeEntregable([])).toBe(0)
    const grande = Array.from({ length: 9 }, () => ({ hecha: true }))
    const chico = [{ hecha: false }]
    expect(porcentajeEntregable(grande)).toBe(100)
    expect(porcentajeEntregable(chico)).toBe(0)
    expect(porcentajeProyecto([...grande, ...chico])).toBe(90)
  })

  it("marca a tiempo, en riesgo y vencido según la fecha de compromiso", () => {
    expect(cumplimientoFecha("2026-11-20", 40, "2026-11-26")).toBe("vencido")
    expect(cumplimientoFecha("2026-11-28", 40, "2026-11-26")).toBe("en_riesgo")
    expect(cumplimientoFecha("2026-12-20", 40, "2026-11-26")).toBe("a_tiempo")
    expect(cumplimientoFecha("2026-11-01", 100, "2026-11-26")).toBe("a_tiempo")
    expect(cumplimientoFecha(null, 10, "2026-11-26")).toBe("sin_fecha")
  })

  it("agrega el entregable y deja nulos los vínculos, sin tocar filas", () => {
    const sql = readFileSync("prisma/migrations/20261126010000_entregables/migration.sql", "utf8")
    expect(sql).toContain('CREATE TABLE "Entregable"')
    expect(sql).toContain('ADD COLUMN "entregableId"')
    expect(sql).toContain('ADD COLUMN "kpiId"')
    expect(sql).toContain("ON DELETE SET NULL")
    expect(sql.toLowerCase()).not.toMatch(/\bupdate\s+"/)
    expect(sql.toLowerCase()).not.toContain("delete from")
  })
})