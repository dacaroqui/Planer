import { describe, expect, it } from "vitest"
import { textoEliminar } from "@/lib/eliminar"
import { PermisoDenegado } from "@/lib/domain"
import { rechazoEliminar } from "@/server/eliminar"
import type { Actor } from "@/lib/domain"

function actor(parcial: Partial<Actor>): Actor {
  return {
    id: "u1",
    email: "ana@cifes.edu.co",
    name: "Ana",
    role: "SOLICITANTE",
    team: null,
    areaId: "a",
    active: true,
    isAdmin: false,
    memberships: [],
    ...parcial,
  }
}

describe("texto de confirmación", () => {
  it("nombra el código y el título, y avisa que no se puede deshacer", () => {
    expect(textoEliminar({ code: "DES-0003", title: "título" })).toBe("Eliminar DES-0003 «título». No se puede deshacer.")
    expect(textoEliminar({ title: "Revisar el índice" })).toBe("Eliminar «Revisar el índice». No se puede deshacer.")
  })
})

describe("rechazo de la acción", () => {
  it("responde 403 a quien no es administrador", () => {
    const lider = actor({ role: "LIDER", memberships: [{ team: "DESARROLLO", role: "LIDER" }] })
    const rechazo = rechazoEliminar(lider)
    expect(rechazo).toEqual({
      ok: false,
      error: "No tiene permiso para eliminar. Solo un administrador puede hacerlo.",
      status: 403,
    })
    expect(rechazoEliminar(actor({ role: "ADMINISTRADOR", isAdmin: true }))).toBeNull()
    expect(new PermisoDenegado().status).toBe(403)
  })
})
