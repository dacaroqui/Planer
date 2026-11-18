import { mkdirSync } from "node:fs"
import path from "node:path"

export { TIPOS_PERMITIDOS, MAX_ATTACHMENT_BYTES, safeFilename, extensionOf, motivoArchivo, assertAllowedFile } from "@/lib/archivos-permitidos"

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

