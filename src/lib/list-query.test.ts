import { describe, expect, it } from "vitest"
import { consultaDesde } from "@/lib/list-query"
import type { Actor } from "@/lib/domain"

const actor = {
  id: "u1",
  name: "Prueba",
  email: "prueba@cifes.edu.co",
  role: "ADMINISTRADOR",
  isAdmin: true,
  active: true,
  memberships: [],
} as unknown as Actor

describe("consultaDesde", () => {
  it("toma el área del solicitante desde el parámetro area", () => {
    const query = consultaDesde({ area: "area-academico", status: "NUEVO" }, actor)
    expect(query.areaId).toBe("area-academico")
    expect(query.status).toBe("NUEVO")
  })

  it("omite el área cuando el filtro es vacío", () => {
    const query = consultaDesde({}, actor)
    expect(query.areaId).toBeUndefined()
  })
})
