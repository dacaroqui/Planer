import { describe, expect, it } from "vitest"
import { TRANSICIONES_OFICIALES } from "@/lib/flujo-oficial"
import { clasificarEtapas, motivoRol } from "@/lib/pasos-accion"
import { armarEtapas } from "@/lib/seguimiento"

const dia = new Date("2026-11-01T12:00:00.000Z")

function etapas(status: string, cambios: { toValue: string | null; createdAt: Date }[] = []) {
  return armarEtapas({ status, createdAt: dia, updatedAt: dia, cambios })
}

function de(status: string) {
  return TRANSICIONES_OFICIALES.filter((item) => item.team === "DESARROLLO" && item.from.includes(status))
}

describe("pasos del detalle", () => {
  it("el líder puede iniciar análisis y el solicitante ve el paso bloqueado", () => {
    const catalogo = de("NUEVO")
    const lider = clasificarEtapas({
      status: "NUEVO",
      etapas: etapas("NUEVO"),
      catalogo,
      permitidas: catalogo.filter((item) => item.roles.includes("LIDER")),
    })
    expect(lider.find((item) => item.id === "analisis")?.permitidas.map((item) => item.name)).toEqual(["Iniciar análisis"])
    expect(lider.find((item) => item.id === "desarrollo")?.motivo).toMatch(/no hay un paso directo/)

    const solicitante = clasificarEtapas({
      status: "NUEVO",
      etapas: etapas("NUEVO"),
      catalogo,
      permitidas: catalogo.filter((item) => item.roles.includes("SOLICITANTE")),
    })
    expect(solicitante.find((item) => item.id === "analisis")?.motivo).toBe("Solo el líder puede…")
    expect(solicitante.find((item) => item.id === "analisis")?.permitidas).toEqual([])
    expect(solicitante.find((item) => item.id === "hecho")?.permitidas.map((item) => item.name)).toEqual(["Cancelar"])
  })

  it("el agente no aprueba y el responsable sí puede pedir información cuando está asignado", () => {
    const catalogo = de("EN_DESARROLLO")
    const agente = clasificarEtapas({
      status: "EN_DESARROLLO",
      etapas: etapas("EN_DESARROLLO", [{ toValue: "EN_ESPERA", createdAt: dia }]),
      catalogo,
      permitidas: catalogo.filter((item) => item.roles.includes("RESPONSABLE")),
    })
    expect(agente.find((item) => item.id === "espera")?.permitidas.map((item) => item.name)).toEqual(["Pedir información"])
    expect(agente.find((item) => item.id === "revision")?.permitidas.map((item) => item.name)).toEqual(["Enviar a pruebas"])
    expect(motivoRol(["LIDER"])).toBe("Solo el líder puede…")
    expect(motivoRol(["SOLICITANTE"])).toBe("Solo el solicitante puede…")
  })
})
