import { describe, expect, it } from "vitest"
import { elegirFuente, fuenteCrm, puedeAvanzar, puedeVerGrowth } from "@/lib/growth"
import type { Actor } from "@/lib/domain"

function actor(partial: Partial<Actor>): Actor {
  return {
    id: "u",
    email: "a@cifes.edu.co",
    name: "Ana",
    role: "SOLICITANTE",
    team: null,
    areaId: "a",
    active: true,
    isAdmin: false,
    memberships: [],
    ...partial,
  }
}

describe("acceso y flujo de Growth", () => {
  it("solo lo ve quien tiene rol en Growth o es administrador", () => {
    expect(puedeVerGrowth(actor({}))).toBe(false)
    expect(puedeVerGrowth(actor({ memberships: [{ team: "MARKETING", role: "LIDER" }] }))).toBe(false)
    expect(puedeVerGrowth(actor({ memberships: [{ team: "GROWTH", role: "OBSERVADOR" }] }))).toBe(true)
    expect(puedeVerGrowth(actor({ role: "ADMINISTRADOR", isAdmin: true }))).toBe(true)
    expect(puedeVerGrowth(actor({ active: false, isAdmin: true, role: "ADMINISTRADOR" }))).toBe(false)
  })

  it("exige una decisión para cerrar y recorre el flujo en orden", () => {
    expect(puedeAvanzar("BORRADOR").destino).toBe("REVISION")
    expect(puedeAvanzar("ANALISIS").ok).toBe(false)
    expect(puedeAvanzar("ANALISIS", "ADOPTAR").destino).toBe("CERRADO")
    expect(puedeAvanzar("CERRADO").ok).toBe(false)
  })

  it("deja el CRM como fuente enchufable y hoy usa la manual", async () => {
    const manual = elegirFuente("MANUAL", { fuente: "MANUAL", updatedAt: new Date("2026-11-18"), etapas: [] })
    expect((await manual.leer())?.fuente).toBe("MANUAL")
    await expect(fuenteCrm().leer()).rejects.toThrow(/CRM/)
  })
})
