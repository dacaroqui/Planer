import { describe, expect, it } from "vitest"
import { adjuntoVisible, esEntradaPublica, esImagenAdjunto, esPorResponder, horasDeMinutos, internoDe, notaResolucionOpcional, pestanasPara, visibilidadDefecto } from "@/lib/cronologia"

describe("cronología", () => {
  it("deriva la nota interna y la entrada pública", () => {
    expect(internoDe("INTERNA")).toBe(true)
    expect(internoDe("REGISTRO")).toBe(false)
    expect(esEntradaPublica("PUBLICA")).toBe(true)
    expect(esEntradaPublica("SOLICITUD_INFO")).toBe(true)
    expect(esEntradaPublica("REGISTRO")).toBe(false)
  })

  it("deja interna la transición del equipo, salvo pedir información y entregar", () => {
    expect(visibilidadDefecto("Iniciar análisis")).toBe("interna")
    expect(visibilidadDefecto("Pedir información")).toBe("publica")
    expect(visibilidadDefecto("Entregar para validación")).toBe("publica")
  })

  it("la nota de qué se hizo es opcional al entregar y al cerrar", () => {
    expect(notaResolucionOpcional({ name: "Entregar para validación", to: "EN_VALIDACION" })).toBe(true)
    expect(notaResolucionOpcional({ name: "Aprobar entrega", to: "CERRADO" })).toBe(true)
    expect(notaResolucionOpcional({ name: "Pedir información", to: "EN_ESPERA" })).toBe(false)
    expect(horasDeMinutos(90)).toBe(1.5)
  })

  it("oculta al solicitante los adjuntos de la nota interna y del registro", () => {
    expect(adjuntoVisible(false, null)).toBe(true)
    expect(adjuntoVisible(false, "PUBLICA")).toBe(true)
    expect(adjuntoVisible(false, "SOLICITUD_INFO")).toBe(true)
    expect(adjuntoVisible(false, "INTERNA")).toBe(false)
    expect(adjuntoVisible(false, "REGISTRO")).toBe(false)
    expect(adjuntoVisible(true, "INTERNA")).toBe(true)
    expect(esImagenAdjunto("image/png", "captura.png")).toBe(true)
    expect(esImagenAdjunto("application/pdf", "brief.pdf")).toBe(false)
  })

  it("por responder es la última entrada del solicitante o la ausencia de respuesta", () => {
    expect(esPorResponder({ requesterId: "ana", lastPublicActorId: null })).toBe(true)
    expect(esPorResponder({ requesterId: "ana", lastPublicActorId: "ana" })).toBe(true)
    expect(esPorResponder({ requesterId: "ana", lastPublicActorId: "valentina" })).toBe(false)
    expect(esPorResponder({ requesterId: "ana", lastPublicActorId: "ana" }, "ana")).toBe(false)
    expect(esPorResponder({ requesterId: "ana", lastPublicActorId: "ana" }, "valentina")).toBe(true)
    expect(pestanasPara({ esSolicitante: true, puedePublica: true, puedeNota: true })).toEqual(["INTERNA", "REGISTRO"])
    expect(pestanasPara({ esSolicitante: true, puedePublica: true, puedeNota: false })).toEqual(["PUBLICA"])
    expect(pestanasPara({ esSolicitante: false, puedePublica: true, puedeNota: true })).toEqual(["PUBLICA", "INTERNA", "REGISTRO", "SOLICITUD_INFO"])
  })
})
