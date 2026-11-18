import { describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import {
  MENSAJE_FECHA_ANTERIOR,
  errorFechaEntrega,
  erroresPaso,
  fechaEntregaRecomendada,
  hoyBogota,
  minutosDeEntrega,
  minutosDePolitica,
  textoFechaIso,
} from "@/lib/fecha-entrega"
import { ZONE } from "@/lib/time"

const lunes = DateTime.fromISO("2026-11-16T09:00:00", { zone: ZONE }).toJSDate()

describe("fecha de entrega esperada", () => {
  it("proyecta la recomendación con el reloj hábil y cae al defecto de la prioridad", () => {
    expect(fechaEntregaRecomendada({ ahora: lunes, prioridad: "MEDIA", minutosTipo: 8 * 60 })).toBe("2026-11-17")
    expect(fechaEntregaRecomendada({ ahora: lunes, prioridad: "MEDIA", minutosTipo: 5 * 8 * 60 })).toBe("2026-11-23")
    expect(minutosDeEntrega("ALTA", null)).toBe(3 * 8 * 60)
    expect(fechaEntregaRecomendada({ ahora: lunes, prioridad: "ALTA" })).toBe("2026-11-19")
    expect(textoFechaIso("2026-11-20")).toBe("20/11/2026")
  })

  it("usa el SLA del tipo y, si no hay, el del equipo", () => {
    const politicas = [
      { team: "COMERCIAL", typeId: null, priority: "MEDIA", resolutionMinutes: 5 * 8 * 60 },
      { team: "COMERCIAL", typeId: "cot", priority: "MEDIA", resolutionMinutes: 8 * 60 },
      { team: "INNOVACION", typeId: null, priority: "BAJA", resolutionMinutes: 20 * 8 * 60 },
    ]
    expect(minutosDePolitica(politicas, "COMERCIAL", "cot", "MEDIA")).toBe(8 * 60)
    expect(minutosDePolitica(politicas, "COMERCIAL", "otra", "MEDIA")).toBe(5 * 8 * 60)
    expect(minutosDePolitica(politicas, "INNOVACION", "", "BAJA")).toBe(20 * 8 * 60)
    expect(minutosDePolitica(politicas, "DESARROLLO", "", "MEDIA")).toBeNull()
  })

  it("rechaza en el acto una fecha anterior a hoy en Bogotá y deja pasar hoy", () => {
    const ahora = DateTime.fromISO("2026-11-18T15:30:00", { zone: ZONE }).toJSDate()
    expect(hoyBogota(ahora)).toBe("2026-11-18")
    expect(errorFechaEntrega("2026-11-17", ahora)).toBe(MENSAJE_FECHA_ANTERIOR)
    expect(errorFechaEntrega("2026-11-18", ahora)).toBeNull()
    expect(errorFechaEntrega("", ahora)).toBeNull()
  })

  it("muestra los errores del paso antes de continuar y no exige la fecha de publicación", () => {
    const base = {
      team: "MARKETING",
      title: "Pi",
      description: "Corta",
      typeId: "",
      extra: "canal",
      steps: "",
      channels: "",
      priority: "MEDIA",
      justification: "",
      desiredDate: "2026-11-01",
      declares: false,
      ahora: DateTime.fromISO("2026-11-18T10:00:00", { zone: ZONE }).toJSDate(),
    }
    expect(erroresPaso(1, { ...base, team: "" }).team).toMatch(/equipo/)
    const paso2 = erroresPaso(2, base)
    expect(paso2.title).toBeTruthy()
    expect(paso2.description).toBeTruthy()
    expect(paso2.typeId).toBeTruthy()
    expect(paso2.channels).toMatch(/canal/)
    expect(paso2.desiredDate).toBe(MENSAJE_FECHA_ANTERIOR)
    expect(paso2.publishAt).toBeUndefined()
    expect(erroresPaso(3, base).declares).toMatch(/datos personales/)
    expect(erroresPaso(2, { ...base, title: "Pieza de bienvenida", description: "Una descripción suficientemente larga para el equipo.", typeId: "t1", channels: "Instagram", desiredDate: "2026-11-20" })).toEqual({})
  })
})
