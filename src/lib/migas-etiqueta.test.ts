import { describe, expect, it } from "vitest"
import { etiquetaMiga } from "@/lib/migas-etiqueta"

const conocidas = { tablero: "Tablero", espacios: "Espacios" }

describe("miga del espacio", () => {
  it("muestra el nombre del espacio y no el id interno", () => {
    const partes = ["espacios", "emp_cifes", "tablero"]
    expect(etiquetaMiga("emp_cifes", 1, partes, "CIFES", conocidas)).toBe("CIFES")
    expect(etiquetaMiga("tablero", 2, partes, "CIFES", conocidas)).toBe("Tablero")
    expect(etiquetaMiga("emp_cifes", 1, ["espacios", "emp_cifes"], "", conocidas)).toBe("emp_cifes")
  })

  it("nombra la propuesta de Growth y no la confunde con radicar", () => {
    expect(etiquetaMiga("nuevo", 1, ["growth", "nuevo"], "", { nuevo: "Radicar", growth: "Growth" })).toBe("Proponer")
    expect(etiquetaMiga("cmw123", 1, ["growth", "cmw123"], "Facilitar la reprogramación", { growth: "Growth" })).toBe("Facilitar la reprogramación")
  })

  it("nombra el objetivo y el KPI sin mostrar el id ni la miga de radicar", () => {
    expect(etiquetaMiga("nuevo", 1, ["objetivos", "nuevo"], "", { nuevo: "Radicar" })).toBe("Nuevo objetivo")
    expect(etiquetaMiga("nuevo", 1, ["kpis", "nuevo"], "", { nuevo: "Radicar" })).toBe("Nuevo KPI")
    expect(etiquetaMiga("cmw123", 1, ["kpis", "cmw123", "editar"], "", {})).toBe("")
    expect(etiquetaMiga("editar", 2, ["kpis", "cmw123", "editar"], "", {})).toBe("Editar")
  })
})
