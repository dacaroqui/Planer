import { describe, expect, it } from "vitest"
import { agruparAsignables, opcionesPersona, type Candidato } from "@/lib/asignacion"

const helena = { id: "helena", name: "Helena", teams: ["DESARROLLO"] as const }
const camila = { id: "camila", name: "Camila", teams: ["MARKETING"] as const }
const producto = { id: "producto", name: "Producto", teams: [] as const }

describe("a quién se puede asignar", () => {
  it("un líder ve solo su equipo y un administrador ve líderes de cualquier área", () => {
    const miembros = [
      { id: helena.id, name: helena.name, teams: [...helena.teams] },
      { id: camila.id, name: camila.name, teams: [...camila.teams] },
    ]
    const delLider = agruparAsignables({ esAdmin: false, team: "DESARROLLO", admins: [ { id: producto.id, name: producto.name } ], miembros })
    expect(delLider.map((item) => item.name)).toEqual(["Helena"])
    expect(delLider.every((item) => item.grupo !== "Líderes")).toBe(true)

    const delAdmin = agruparAsignables({ esAdmin: true, admins: [{ id: producto.id, name: producto.name }], miembros })
    expect(delAdmin.filter((item) => item.grupo === "Líderes").map((item) => item.name)).toEqual(["Producto"])
    expect(delAdmin.filter((item) => item.grupo === "Cualquier área").map((item) => item.name)).toEqual(["Helena", "Camila"])
  })

  it("elige el área primero y el administrador siempre ve el grupo Líderes", () => {
    const candidatos: Candidato[] = [
      { id: "producto", name: "Producto", teams: [], esAdmin: true },
      { id: "helena", name: "Helena", teams: ["DESARROLLO"], esAdmin: false },
      { id: "camila", name: "Camila", teams: ["MARKETING"], esAdmin: false },
    ]
    expect(opcionesPersona(false, "DESARROLLO", candidatos).map((item) => item.name)).toEqual(["Helena"])
    const deMarketing = opcionesPersona(true, "MARKETING", candidatos)
    expect(deMarketing.filter((item) => item.grupo === "Líderes").map((item) => item.name)).toEqual(["Producto"])
    expect(deMarketing.filter((item) => item.grupo === "Marketing").map((item) => item.name)).toEqual(["Camila"])
    expect(opcionesPersona(true, "", candidatos).every((item) => item.grupo === "Líderes")).toBe(true)
  })
})
