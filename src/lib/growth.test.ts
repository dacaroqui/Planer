import { describe, expect, it } from "vitest"
import { desgloseEtapa, elegirFuente, etapaCoincide, fuenteCrm, puedeAvanzar, puedeVerGrowth } from "@/lib/growth"
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

  it("desglosa una etapa con conversión, pérdidas y delta del periodo anterior", () => {
    const etapas = [
      { nombre: "Consultas", valor: 400, orden: 1, valorPrevio: 380 },
      { nombre: "Valoraciones agendadas", valor: 160, orden: 2, valorPrevio: 150 },
      { nombre: "Asistencias", valor: 96, orden: 3, valorPrevio: 88 },
    ]
    expect(etapaCoincide("Asistencias", "Asistencia")).toBe(true)
    expect(etapaCoincide("Valoraciones agendadas", "Agendamiento")).toBe(true)
    expect(etapaCoincide("Recompras", "Recompra")).toBe(true)
    expect(etapaCoincide("Consultas", "Recompra")).toBe(false)
    const fila = desgloseEtapa(etapas, 2)
    expect(fila?.valor).toBe(96)
    expect(fila?.desdeAnterior).toBe("60%")
    expect(fila?.desdeInicio).toBe("24%")
    expect(fila?.perdidas).toBe(64)
    expect(fila?.delta).toBe(8)
    expect(desgloseEtapa(etapas, 0)?.perdidas).toBeNull()
    expect(desgloseEtapa([{ nombre: "Consultas", valor: 10, orden: 1 }], 0)?.delta).toBeNull()
  })

  it("deja el CRM como fuente enchufable y hoy usa la manual", async () => {
    const manual = elegirFuente("MANUAL", { fuente: "MANUAL", updatedAt: new Date("2026-11-18"), etapas: [] })
    expect((await manual.leer())?.fuente).toBe("MANUAL")
    await expect(fuenteCrm().leer()).rejects.toThrow(/CRM/)
  })
})
