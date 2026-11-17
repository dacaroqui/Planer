import { describe, expect, it } from "vitest"
import { armarEtapas, etapaDeEstado, pasoEsperado } from "@/lib/seguimiento"

const dia = (iso: string) => new Date(iso)

describe("seguimiento del solicitante", () => {
  it("traduce los estados reales a las etapas amistosas", () => {
    expect(etapaDeEstado("NUEVO")).toBe("radicado")
    expect(etapaDeEstado("EN_REVISION_BRIEF")).toBe("analisis")
    expect(etapaDeEstado("EN_ESPERA")).toBe("espera")
    expect(etapaDeEstado("EN_PRODUCCION")).toBe("desarrollo")
    expect(etapaDeEstado("EN_VALIDACION")).toBe("revision")
    expect(etapaDeEstado("CERRADO")).toBe("hecho")
  })

  it("omite la espera si el caso no pasó por ella y marca la etapa actual", () => {
    const etapas = armarEtapas({
      status: "EN_DESARROLLO",
      createdAt: dia("2026-11-01T12:00:00.000Z"),
      updatedAt: dia("2026-11-10T12:00:00.000Z"),
      cambios: [
        { toValue: "EN_ANALISIS", createdAt: dia("2026-11-02T12:00:00.000Z") },
        { toValue: "EN_DESARROLLO", createdAt: dia("2026-11-04T12:00:00.000Z") },
      ],
    })
    expect(etapas.map((etapa) => etapa.id)).toEqual(["radicado", "analisis", "desarrollo", "revision", "hecho"])
    expect(etapas.find((etapa) => etapa.id === "desarrollo")).toMatchObject({ estado: "actual", fecha: "2026-11-04T12:00:00.000Z" })
    expect(etapas.find((etapa) => etapa.id === "analisis")).toMatchObject({ estado: "hecha", fecha: "2026-11-02T12:00:00.000Z" })
    expect(etapas.find((etapa) => etapa.id === "revision")?.estado).toBe("pendiente")
  })

  it("muestra la espera cuando aplica y pide una acción al solicitante", () => {
    const etapas = armarEtapas({
      status: "EN_ESPERA",
      createdAt: dia("2026-11-01T12:00:00.000Z"),
      updatedAt: dia("2026-11-08T12:00:00.000Z"),
      cambios: [
        { toValue: "EN_ANALISIS", createdAt: dia("2026-11-02T12:00:00.000Z") },
        { toValue: "EN_DESARROLLO", createdAt: dia("2026-11-04T12:00:00.000Z") },
        { toValue: "EN_ESPERA", createdAt: dia("2026-11-08T12:00:00.000Z") },
      ],
    })
    expect(etapas.map((etapa) => etapa.id)).toContain("espera")
    expect(etapas.find((etapa) => etapa.id === "espera")).toMatchObject({ estado: "actual", label: "En espera de información" })
    expect(etapas.find((etapa) => etapa.id === "desarrollo")?.estado).toBe("hecha")
    expect(pasoEsperado("EN_ESPERA").cta).toBe("Responder y continuar")
    expect(pasoEsperado("EN_VALIDACION").cta).toBe("Revisar la entrega")
  })

  it("cierra en Rechazado sin llamarlo Hecho", () => {
    const etapas = armarEtapas({
      status: "RECHAZADO",
      createdAt: dia("2026-11-01T12:00:00.000Z"),
      updatedAt: dia("2026-11-03T12:00:00.000Z"),
      cambios: [{ toValue: "RECHAZADO", createdAt: dia("2026-11-03T12:00:00.000Z") }],
    })
    expect(etapas.find((etapa) => etapa.id === "hecho")).toMatchObject({ label: "Rechazado", estado: "actual" })
  })
})
