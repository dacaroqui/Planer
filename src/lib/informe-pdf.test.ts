import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { pdfInforme, type InformePdf } from "@/lib/informe-pdf"

const ejemplo: InformePdf = {
  semana: "2026-W48",
  desde: "23/11/2026",
  hasta: "29/11/2026",
  cumplimiento: 40,
  aTiempo: 1,
  enRiesgo: 0,
  vencidos: 1,
  proyectos: [{
    nombre: "Escuela de ejemplo",
    area: "Marketing",
    porcentaje: 50,
    estado: "En riesgo",
    horasEstimadas: 8,
    horasReales: 3,
    entregables: [{ nombre: "Pieza de ejemplo", porcentaje: 50, estado: "A tiempo", fecha: "20/12/2026" }],
    hechasSemana: ["Publicar la pieza"],
    planeadas: ["Cerrar el guion"],
    vencidas: [],
  }],
  kpis: [{ nombre: "Asistencia de ejemplo", ambito: "CIFES", actual: "68", meta: "75", estado: "Aprobada" }],
}

describe("informe semanal", () => {
  it("genera un PDF con la marca, la semana y el proyecto de ejemplo", async () => {
    const buffer = await pdfInforme(ejemplo)
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-")
    const dir = mkdtempSync(join(tmpdir(), "informe-"))
    const archivo = join(dir, "informe.pdf")
    writeFileSync(archivo, buffer)
    const texto = execFileSync("pdftotext", ["-layout", archivo, "-"], { encoding: "utf8" })
    expect(texto).toContain("CIFES")
    expect(texto).toContain("Luvania")
    expect(texto).toContain("2026-W48")
    expect(texto).toContain("Escuela de ejemplo")
    expect(texto).toContain("Asistencia de ejemplo")
    const info = execFileSync("pdfinfo", [archivo], { encoding: "utf8" })
    const paginas = Number(info.match(/Pages:\s+(\d+)/)?.[1] || 0)
    expect(paginas).toBeGreaterThanOrEqual(3)
  })
})