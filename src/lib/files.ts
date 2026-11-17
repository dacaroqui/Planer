import { mkdirSync } from "node:fs"
import path from "node:path"

const ALLOWED = new Set([
  "pdf", "png", "jpg", "jpeg", "webp", "gif", "txt", "csv",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
])

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

export function raizDelProyecto(cwd = process.cwd()) {
  const normal = cwd.replace(/\\/g, "/")
  if (normal.endsWith("/.next/standalone")) return path.resolve(cwd, "../..")
  return cwd
}

export function resolverDirectorioAdjuntos(cwd = process.cwd(), configurado = process.env.UPLOAD_DIR) {
  const raiz = raizDelProyecto(cwd)
  if (!configurado) return path.join(raiz, "uploads")
  return path.isAbsolute(configurado) ? configurado : path.resolve(raiz, configurado)
}

export function uploadDir() {
  const dir = resolverDirectorioAdjuntos()
  mkdirSync(dir, { recursive: true })
  return dir
}

export function safeFilename(name: string) {
  const base = path.basename(name).replace(/[^\w.\- áéíóúüñÁÉÍÓÚÜÑ]+/g, "_").replace(/^\.+/, "")
  return (base || "archivo").slice(0, 120)
}

export function extensionOf(name: string) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(safeFilename(name))
  return match?.[1]?.toLowerCase() ?? ""
}

export function assertAllowedFile(name: string, size: number) {
  if (size <= 0) throw new Error("El archivo está vacío.")
  if (size > MAX_ATTACHMENT_BYTES) throw new Error("El archivo supera el límite de 25 MB.")
  const ext = extensionOf(name)
  if (!ALLOWED.has(ext)) throw new Error("Ese tipo de archivo no está permitido.")
  return ext
}
