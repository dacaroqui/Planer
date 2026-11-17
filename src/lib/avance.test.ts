import { describe, expect, it } from "vitest"
import { TEXTO_AVANCE, avanceDesdeLista, avanceProyecto, porcentajeTarea } from "@/lib/avance"

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

  it("promedia tareas y requerimientos y no llega a 100 si hay abiertos", () => {
    const avance = avanceProyecto({
      tareas: [{ status: "HECHA", subtareas: [] }],
      requerimientos: [{ status: "CERRADO" }, { status: "NUEVO" }],
    })
    expect(avance.porcentaje).toBe(75)
    expect(avance.fuente).toBe("mixto")
    const tope = avanceProyecto({
      tareas: [{ status: "HECHA", subtareas: [] }],
      requerimientos: [{ status: "NUEVO" }],
    })
    expect(tope.porcentaje).toBeLessThan(100)
    expect(TEXTO_AVANCE).toMatch(/promedio/)
  })

  it("el detalle usa el mismo porcentaje que Planner, contando las subtareas", () => {
    const avance = avanceDesdeLista([
      { id: "raiz", status: "EN_CURSO", parentId: null },
      { id: "hecha", status: "HECHA", parentId: "raiz" },
      { id: "pendiente", status: "PENDIENTE", parentId: "raiz" },
    ], "EN_ANALISIS")
    expect(avance.porcentaje).toBe(50)
  })
})
