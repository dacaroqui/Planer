import { describe, expect, it } from "vitest"
import { avanceProyecto, porcentajeTarea } from "@/lib/avance"

describe("RQ-48 RQ-49 RQ-51 avance", () => {
  it("calcula el porcentaje de la tarea con sus subtareas", () => {
    expect(porcentajeTarea({ status: "EN_CURSO", subtareas: [{ status: "HECHA" }, { status: "PENDIENTE" }] })).toBe(50)
    expect(porcentajeTarea({ status: "HECHA", subtareas: [] })).toBe(100)
    expect(porcentajeTarea({ status: "PENDIENTE", subtareas: [] })).toBe(0)
  })

  it("calcula el porcentaje del proyecto como promedio de sus tareas", () => {
    const avance = avanceProyecto({
      tareas: [
        { status: "EN_CURSO", subtareas: [{ status: "HECHA" }, { status: "PENDIENTE" }] },
        { status: "HECHA", subtareas: [] },
      ],
      requerimientos: [],
    })
    expect(avance.porcentaje).toBe(75)
    expect(avance.fuente).toBe("tareas")
  })

  it("si no hay tareas usa requerimientos cerrados", () => {
    const avance = avanceProyecto({
      tareas: [],
      requerimientos: [{ status: "CERRADO" }, { status: "NUEVO" }],
    })
    expect(avance.porcentaje).toBe(50)
    expect(avance.fuente).toBe("requerimientos")
  })
})
