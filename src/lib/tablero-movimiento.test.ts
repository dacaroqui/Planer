import { describe, expect, it } from "vitest"
import { movimientoAlSoltar, movimientoExigeDialogo, validarDatosMovimiento, type TarjetaMovible } from "@/lib/tablero-movimiento"

const tarjetas: TarjetaMovible[] = [
  {
    code: "DES-0010",
    moves: [{ name: "Aprobar entrega", column: "Cerrado", to: "CERRADO" }],
  },
  {
    code: "DES-0014",
    moves: [
      { name: "Aprobar entrega", column: "Cerrado", to: "CERRADO" },
      { name: "Devolver", column: "En desarrollo", to: "EN_DESARROLLO", requiresComment: true },
    ],
  },
]

describe("tablero: la tarjeta arrastrada", () => {
  it("usa el código arrastrado y no el de otra tarjeta de la misma columna", () => {
    const decision = movimientoAlSoltar(tarjetas, "DES-0014", "Cerrado")
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.code).toBe("DES-0014")
    expect(decision.moves.map((item) => item.name)).toEqual(["Aprobar entrega"])
    expect(decision.code).not.toBe("DES-0010")
  })

  it("no confirma un movimiento que exige motivo o entrega", () => {
    const entregar = {
      name: "Entregar para validación",
      column: "En validación",
      to: "EN_VALIDACION",
      requiresComment: true,
      requiresDelivery: true,
    }
    expect(movimientoExigeDialogo(entregar)).toBe(true)
    expect(validarDatosMovimiento(entregar, "", "")).toMatch(/motivo/)
    expect(validarDatosMovimiento(entregar, "Listo para revisar.", "")).toBeNull()
    expect(validarDatosMovimiento(tarjetas[1].moves[0], "", "")).toBeNull()
  })
})
