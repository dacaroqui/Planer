function xml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function hoja(filas: string[][]) {
  const cuerpo = filas.map((fila, indice) => {
    const celdas = fila.map((valor, columna) => {
      const ref = `${columnaALetras(columna)}${indice + 1}`
      return `<c r="${ref}" t="inlineStr"><is><t>${xml(valor)}</t></is></c>`
    }).join("")
    return `<row r="${indice + 1}">${celdas}</row>`
  }).join("")
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cuerpo}</sheetData></worksheet>`
}

function columnaALetras(indice: number) {
  let n = indice + 1
  let letras = ""
  while (n > 0) {
    const resto = (n - 1) % 26
    letras = String.fromCharCode(65 + resto) + letras
    n = Math.floor((n - 1) / 26)
  }
  return letras
}

const TABLA_CRC = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  TABLA_CRC[n] = c >>> 0
}

function crc32(datos: Buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < datos.length; i++) crc = (TABLA_CRC[(crc ^ datos[i]) & 0xff] ^ (crc >>> 8)) >>> 0
  return (crc ^ 0xffffffff) >>> 0
}

function zipSinComprimir(archivos: { nombre: string; datos: string }[]) {
  const locales: Buffer[] = []
  const centrales: Buffer[] = []
  let offset = 0
  for (const archivo of archivos) {
    const nombre = Buffer.from(archivo.nombre)
    const datos = Buffer.from(archivo.datos)
    const suma = crc32(datos)
    const local = Buffer.alloc(30 + nombre.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt32LE(suma, 14)
    local.writeUInt32LE(datos.length, 18)
    local.writeUInt32LE(datos.length, 22)
    local.writeUInt16LE(nombre.length, 26)
    nombre.copy(local, 30)
    const central = Buffer.alloc(46 + nombre.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(suma, 16)
    central.writeUInt32LE(datos.length, 20)
    central.writeUInt32LE(datos.length, 24)
    central.writeUInt16LE(nombre.length, 28)
    central.writeUInt32LE(offset, 42)
    nombre.copy(central, 46)
    locales.push(local, datos)
    centrales.push(central)
    offset += local.length + datos.length
  }
  const directorio = Buffer.concat(centrales)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(archivos.length, 8)
  fin.writeUInt16LE(archivos.length, 10)
  fin.writeUInt32LE(directorio.length, 12)
  fin.writeUInt32LE(offset, 16)
  return Buffer.concat([...locales, directorio, fin])
}

export function libroHojas(hojas: { nombre: string; filas: string[][] }[]) {
  const hojasXml = hojas.map((hojaItem, indice) => ({
    nombre: `xl/worksheets/sheet${indice + 1}.xml`,
    datos: hoja(hojaItem.filas),
    id: `rId${indice + 1}`,
    titulo: hojaItem.nombre,
  }))
  return zipSinComprimir([
    {
      nombre: "[Content_Types].xml",
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${hojasXml.map((item) => `<Override PartName="/${item.nombre}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`,
    },
    {
      nombre: "_rels/.rels",
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdWorkbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      nombre: "xl/workbook.xml",
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${hojasXml.map((item, indice) => `<sheet name="${xml(item.titulo)}" sheetId="${indice + 1}" r:id="${item.id}"/>`).join("")}</sheets></workbook>`,
    },
    {
      nombre: "xl/_rels/workbook.xml.rels",
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojasXml.map((item) => `<Relationship Id="${item.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${item.id.slice(3)}.xml"/>`).join("")}
</Relationships>`,
    },
    ...hojasXml.map((item) => ({ nombre: item.nombre, datos: item.datos })),
  ])
}

export function libroXlsx(filas: string[][]) {
  return libroHojas([{ nombre: "Plan de trabajo", filas }])
}

export function filasExportables(filas: { proyecto: string; area: string; actividad: string; responsable: string; participantes: string[]; estado: string; bloqueo: string; inicio: string; fin: string; horasEstimadas: string; horasReales: string; kpi: string }[]) {
  return [
    ["Proyecto", "Área", "Actividad", "Responsable", "Participantes", "Estado", "Bloqueo", "Inicio", "Fin", "Horas est.", "Horas reales", "KPI"],
    ...filas.map((fila) => [fila.proyecto, fila.area, fila.actividad, fila.responsable, fila.participantes.join(", "), fila.estado, fila.bloqueo, fila.inicio, fila.fin, fila.horasEstimadas, fila.horasReales, fila.kpi]),
  ]
}
