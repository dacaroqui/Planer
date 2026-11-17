import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadDir } from "@/lib/files"
import { cuerpoSinSesion } from "@/lib/rutas-publicas"
import { resolverAdjunto } from "@/server/adjuntos"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase() ?? null
  const { id } = await context.params
  const acceso = await resolverAdjunto(email, id)
  if (acceso.status === 401) return NextResponse.json(cuerpoSinSesion(), { status: 401 })
  if (acceso.status === 403) return new NextResponse("Usuario inactivo.", { status: 403 })
  if (acceso.status !== 200) return new NextResponse("No encontrado.", { status: 404 })
  try {
    const bytes = await readFile(path.join(uploadDir(), acceso.storedName))
    const inline = acceso.mimeType.startsWith("image/")
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": acceso.mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(acceso.filename)}`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return new NextResponse("No encontrado.", { status: 404 })
  }
}
