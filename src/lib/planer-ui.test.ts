import { describe, expect, it } from "vitest"
import { enUltimaSemana, iconoPrioridad, iconoTipo, iniciales, tiempoRelativo } from "@/lib/planer-ui"

const ahora = new Date("2026-11-17T12:00:00.000Z")

describe("interfaz Planer", () => {
  it("agrupa la última semana y escribe el tiempo en español", () => {
    expect(enUltimaSemana(new Date("2026-11-14T12:00:00.000Z"), ahora)).toBe(true)
    expect(enUltimaSemana(new Date("2026-11-01T12:00:00.000Z"), ahora)).toBe(false)
    expect(tiempoRelativo(new Date("2026-11-14T12:00:00.000Z"), ahora)).toBe("hace 3 días")
    expect(tiempoRelativo(new Date("2026-11-17T11:00:00.000Z"), ahora)).toBe("hace 1 hora")
    expect(tiempoRelativo(ahora, ahora)).toBe("ahora")
  })

  it("distingue error, pieza, tarea y subtarea", () => {
    expect(iconoTipo("Error (bug)")).toBe("error")
    expect(iconoTipo("Pieza gráfica")).toBe("pieza")
    expect(iconoTipo("Revisar el índice", true)).toBe("subtarea")
    expect(iconoTipo("Nueva funcionalidad")).toBe("requerimiento")
  })

  it("usa iconos de prioridad al estilo de un tablero", () => {
    expect(iconoPrioridad("CRITICA")).toBe("critica")
    expect(iconoPrioridad("ALTA")).toBe("alta")
    expect(iconoPrioridad("MEDIA")).toBe("media")
    expect(iconoPrioridad("BAJA")).toBe("baja")
    expect(iniciales("David Caro")).toBe("DC")
  })
})