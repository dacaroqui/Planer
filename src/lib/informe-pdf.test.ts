import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { TEXTO_CUMPLIMIENTO } from "@/lib/entregables"
import { pdfInforme, type InformePdf } from "@/lib/informe-pdf"

const ejemplo: InformePdf = {
  semana: "2026-W48",
  desde: "23/11/2026",
  hasta: "29/11/2026",
  cumplimiento: 40,
  formula: TEXTO_CUMPLIMIENTO,
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
    kpisVinculados: [{ nombre: "Tasa de respuesta", medida: "Tasa de respuesta · Línea base" }],
  }],
  kpis: [{ nombre: "Asistencia de ejemplo", ambito: "CIFES", medida: "Línea base", estado: "En línea base" }],
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
    expect(texto).toContain("Línea base")
    expect(texto).toContain("No es el promedio")
    expect(texto).toContain("Tasa de respuesta")
    const info = execFileSync("pdfinfo", [archivo], { encoding: "utf8" })
    const paginas = Number(info.match(/Pages:\s+(\d+)/)?.[1] || 0)
    expect(paginas).toBeGreaterThanOrEqual(3)
  })

  it("deja pdfkit fuera del bundle y no usa Helvetica en los estilos", () => {
    const config = readFileSync("next.config.ts", "utf8")
    const ruta = readFileSync("src/app/api/informes/route.ts", "utf8")
    const documento = readFileSync("src/lib/informe-pdf.tsx", "utf8")
    expect(config).toContain("serverExternalPackages")
    expect(config).toContain('"pdfkit"')
    expect(config).toContain('"@react-pdf/renderer"')
    expect(config).toContain('"/api/informes"')
    expect(config).toContain("./src/lib/fonts/**/*")
    expect(config).toContain("./node_modules/pdfkit/js/standard-fonts/**/*")
    expect(ruta).toContain('runtime = "nodejs"')
    expect(documento).toContain('fontStyle: "italic"')
    expect(documento).toContain("fontWeight: 700")
    expect(documento).not.toContain("Helvetica")
  })
})