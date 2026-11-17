import { describe, expect, it } from "vitest"
import { claveGrupo, columnaDeEstado, necesitaInformacion, transicionHaciaColumna } from "@/lib/kanban"
import { estadoEnlace, MENSAJE_ENLACE } from "@/lib/invitacion-estado"
import { pistasClave } from "@/lib/clave"

const ahora = new Date("2026-11-17T12:00:00.000Z")

describe("tablero del espacio e invitación", () => {
  it("agrupa los estados del flujo en cuatro columnas", () => {
    expect(columnaDeEstado({ category: "POR_HACER", key: "NUEVO", name: "Nuevo" })).toBe("Por hacer")
    expect(columnaDeEstado({ category: "EN_CURSO", key: "EN_DESARROLLO", name: "En desarrollo" })).toBe("En progreso")
    expect(columnaDeEstado({ category: "EN_CURSO", key: "EN_PRUEBAS", name: "En pruebas (QA)" })).toBe("En revisión")
    expect(columnaDeEstado({ category: "TERMINADO", key: "CERRADO", name: "Cerrado" })).toBe("Hecho")
    expect(columnaDeEstado({ category: "EN_CURSO", key: "EN_ESPERA", name: "En espera de información" })).toBe("En progreso")
  })

  it("un movimiento no permitido vuelve a su columna", () => {
    const estados = [
      { key: "NUEVO", category: "POR_HACER", name: "Nuevo" },
      { key: "EN_DESARROLLO", category: "EN_CURSO", name: "En desarrollo" },
    ]
    const decision = transicionHaciaColumna([{ name: "Iniciar desarrollo", to: "EN_DESARROLLO" }], estados, "Hecho")
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.error).toMatch(/vuelve a su lugar/)
    expect(transicionHaciaColumna([{ name: "Iniciar desarrollo", to: "EN_DESARROLLO" }], estados, "En progreso").ok).toBe(true)
  })

  it("distingue invitación pendiente, aceptada, vencida y revocada", () => {
    expect(estadoEnlace(null)).toBe("inexistente")
    expect(estadoEnlace({ expiresAt: new Date("2026-12-01"), usedAt: null, revokedAt: null }, ahora)).toBe("pendiente")
    expect(estadoEnlace({ expiresAt: new Date("2026-12-01"), usedAt: ahora, revokedAt: null }, ahora)).toBe("aceptada")
    expect(estadoEnlace({ expiresAt: new Date("2020-01-01"), usedAt: null, revokedAt: null }, ahora)).toBe("vencida")
    expect(estadoEnlace({ expiresAt: new Date("2026-12-01"), usedAt: null, revokedAt: ahora }, ahora)).toBe("revocada")
    expect(MENSAJE_ENLACE.vencida).toMatch(/venció/)
    expect(pistasClave("abc", "ana@cifes.edu.co").some((item) => !item.ok)).toBe(true)
    expect(pistasClave("clave1234", "ana@cifes.edu.co").every((item) => item.ok)).toBe(true)
    expect(claveGrupo({ asignado: "Ana", priority: "ALTA", area: "Académico" }, "area")).toBe("Académico")
    expect(necesitaInformacion("EN_ESPERA")).toBe(true)
    expect(necesitaInformacion("NUEVO")).toBe(false)
  })
})