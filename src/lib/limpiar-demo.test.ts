import { describe, expect, it } from "vitest"
import { codigoTrasReinicio, conservarUsuario, resumenLimpieza } from "@/lib/limpiar-demo"

describe("limpieza de la demostración", () => {
  it("conserva solo las dos cuentas reales", () => {
    expect(conservarUsuario("admin@cifes.edu.co")).toBe(true)
    expect(conservarUsuario(" Producto@CIFES.edu.co ")).toBe(true)
    expect(conservarUsuario("admin.ejemplo@cifes.edu.co")).toBe(false)
    expect(conservarUsuario("ana.ejemplo@cifes.edu.co")).toBe(false)
  })

  it("anuncia el reinicio en 0001 y distingue la simulación", () => {
    expect(codigoTrasReinicio()).toBe("0001")
    const texto = resumenLimpieza({
      solicitudes: 2,
      tareas: 3,
      pausas: 1,
      comentarios: 4,
      historial: 5,
      adjuntos: 1,
      proyectos: 2,
      invitaciones: 1,
      usuarios: 8,
      secuencias: ["DES", "MKT"],
    }, true)
    expect(texto).toContain("Simulación")
    expect(texto).toContain("Solicitudes: 2")
    expect(texto).toContain("0001")
    expect(texto).toContain("producto@cifes.edu.co")
    expect(texto).not.toContain("Limpieza aplicada")
  })
})
