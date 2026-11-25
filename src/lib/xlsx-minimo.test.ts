import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { crc32 } from "node:zlib"
import { describe, expect, it } from "vitest"
import { libroHojas, libroXlsx } from "@/lib/xlsx-minimo"

function comprobarCrc(libro: Buffer) {
  let offset = 0
  let partes = 0
  while (offset + 30 <= libro.length && libro.readUInt32LE(offset) === 0x04034b50) {
    const suma = libro.readUInt32LE(offset + 14)
    const tamano = libro.readUInt32LE(offset + 18)
    const nombre = libro.readUInt16LE(offset + 26)
    const extra = libro.readUInt16LE(offset + 28)
    const inicio = offset + 30 + nombre + extra
    const datos = libro.subarray(inicio, inicio + tamano)
    expect(suma).not.toBe(0)
    expect(suma).toBe(crc32(datos))
    offset = inicio + tamano
    partes += 1
  }
  expect(partes).toBeGreaterThan(1)
  const dir = mkdtempSync(join(tmpdir(), "xlsx-"))
  const ruta = join(dir, "libro.xlsx")
  writeFileSync(ruta, libro)
  execFileSync("unzip", ["-t", ruta], { stdio: "pipe" })
  execFileSync("python3", ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); raise SystemExit(0 if z.testzip() is None else 1)", ruta], { stdio: "pipe" })
}

describe("CRC del xlsx", () => {
  it("guarda el CRC-32 real en el plan y en la matriz de objetivos", () => {
    comprobarCrc(libroXlsx([["Proyecto", "Actividad"], ["Escuela de ejemplo", "Parrilla"]]))
    comprobarCrc(libroHojas([
      { nombre: "Matriz", filas: [["Marca", "Objetivo"], ["CIFES", "Asistencia de ejemplo"]] },
      { nombre: "KPIs por persona", filas: [["Persona", "KPI"], ["Participante 1", "Entregas"]] },
      { nombre: "KPIs por área", filas: [["Área", "KPI"], ["Marketing", "Piezas"]] },
    ]))
  })
})
