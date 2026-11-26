import { describe, expect, it } from "vitest"
import { kpisPorAmbito } from "@/server/informe"
import { totalesPlan } from "@/lib/plan-trabajo"

describe("informe y plan", () => {
  it("lista cada KPI de objetivo una sola vez y coincide con los totales del plan", () => {
    const compartido = { id: "kpi-1", nombre: "Asistencia", unidad: "%", actual: null, meta: null, estadoMeta: "EN_LINEA_BASE" as const }
    const propio = { id: "kpi-2", nombre: "Salida", unidad: "piezas", actual: 1, meta: 4, estadoMeta: "APROBADA" as const }
    const lista = kpisPorAmbito([
      { ambito: "Objetivo escuela", kpis: [compartido] },
      { ambito: "Objetivo escuela", kpis: [compartido] },
      { ambito: "Producto", kpis: [propio] },
    ])
    expect(lista).toHaveLength(2)
    expect(lista.map((item) => item.nombre)).toEqual(["Asistencia", "Salida"])
    const filas = [
      { hecha: true, parentId: null, horasEstimadas: 5, horasReales: 2 },
      { hecha: false, parentId: "a", horasEstimadas: 3, horasReales: 1 },
    ]
    expect(totalesPlan(filas)).toEqual(totalesPlan(filas.map((fila) => ({ ...fila }))))
    expect(totalesPlan(filas).estimadas).toBe(8)
    expect(totalesPlan(filas).cumplimiento).toBe(100)
  })
})
