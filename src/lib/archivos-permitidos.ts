const ALLOWED = new Set([
  "pdf", "png", "jpg", "jpeg", "webp", "gif", "txt", "csv", "md", "zip",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
])

const MIME_POR_EXTENSION: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  txt: ["text/plain"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  md: ["text/markdown", "text/plain", "text/x-markdown"],
  zip: ["application/zip", "application/x-zip-compressed"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
}

export const TIPOS_PERMITIDOS = "Permitidos: PDF, imágenes, Word, Excel, PowerPoint, TXT, MD, CSV, ZIP"
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

export function safeFilename(name: string) {
  const base = (name.split(/[/\\]/).pop() ?? name).replace(/[^\w.\- áéíóúüñÁÉÍÓÚÜÑ]+/g, "_").replace(/^\.+/, "")
  return (base || "archivo").slice(0, 120)
}

export function extensionOf(name: string) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(safeFilename(name))
  return match?.[1]?.toLowerCase() ?? ""
}

export function motivoArchivo(name: string, size: number, mime = "") {
  if (size <= 0) return "El archivo está vacío."
  if (size > MAX_ATTACHMENT_BYTES) return "El archivo supera el límite de 25 MB."
  const ext = extensionOf(name)
  const tipo = mime.split(";")[0]?.trim().toLowerCase() ?? ""
  if (ALLOWED.has(ext)) {
    const esperados = MIME_POR_EXTENSION[ext] ?? []
    if (!tipo || tipo === "application/octet-stream" || tipo === "text/plain" || esperados.includes(tipo)) return null
    return "Ese tipo de archivo no está permitido."
  }
  return "Ese tipo de archivo no está permitido."
}

export function assertAllowedFile(name: string, size: number, mime = "") {
  const motivo = motivoArchivo(name, size, mime)
  if (motivo) throw new Error(motivo)
  return extensionOf(name)
}
