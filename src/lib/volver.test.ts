import { describe, expect, it } from "vitest"
import { construirMigas, padreDeMigas } from "@/lib/migas-construir"
import { decidirVolver, registrarHistorial } from "@/lib/volver"

describe("volver dentro de la app", () => {
  it("retrocede si la ruta actual ya tiene una página previa en la app", () => {
    const pila = registrarHistorial(registrarHistorial([], "/panel"), "/requerimientos/DES-0002")
    expect(decidirVolver(pila, "/requerimientos/DES-0002", "/requerimientos")).toEqual({
      modo: "atras",
      pila: ["/panel"],
    })
  })

  it("va al padre de la miga cuando no hay historial interno", () => {
    const migas = construirMigas("/requerimientos/DES-0002", "El aula no abre")
    expect(migas.map((item) => item.label)).toEqual(["Inicio", "Requerimientos", "El aula no abre"])
    expect(decidirVolver(["/requerimientos/DES-0002"], "/requerimientos/DES-0002", padreDeMigas(migas))).toEqual({
      modo: "padre",
      href: "/requerimientos",
    })
  })

  it("no duplica la ruta actual en el historial", () => {
    expect(registrarHistorial(["/panel"], "/panel")).toEqual(["/panel"])
  })
})
