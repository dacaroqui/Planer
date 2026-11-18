import { describe, expect, it } from "vitest"
import { incorporarArchivos, puedeSeguirConArchivos, quitarArchivo } from "@/lib/archivos-zona"
import { assertAllowedFile } from "@/lib/files"

describe("archivos de radicar", () => {
  it("acepta markdown aunque el navegador mande text/plain o un tipo vacío", () => {
    expect(assertAllowedFile("DESIGN (1).md", 20, "")).toBe("md")
    expect(assertAllowedFile("DESIGN (1).md", 20, "text/plain")).toBe("md")
    expect(assertAllowedFile("notas.zip", 20, "application/zip")).toBe("zip")
  })

  it("al quitar un archivo inválido se puede continuar", () => {
    const elegidos = incorporarArchivos([], [{ name: "virus.exe", size: 12, type: "application/octet-stream" }])
    expect(elegidos[0]?.error).toMatch(/no está permitido/)
    expect(puedeSeguirConArchivos(elegidos)).toBe(false)
    const limpios = quitarArchivo(elegidos, elegidos[0].id)
    expect(limpios).toEqual([])
    expect(puedeSeguirConArchivos(limpios)).toBe(true)
  })
})
