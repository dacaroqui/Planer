import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadDir } from "@/lib/files"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) return new NextResponse("Debe iniciar sesión.", { status: 401 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.active) return new NextResponse("Usuario inactivo.", { status: 403 })
  const { id } = await context.params
  const file = await prisma.attachment.findUnique({ where: { id } })
  if (!file) return new NextResponse("No encontrado.", { status: 404 })
  const stored = path.join(uploadDir(), file.storedName)
  try {
    const bytes = await readFile(stored)
    const inline = file.mimeType.startsWith("image/")
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return new NextResponse("El archivo no está en el disco.", { status: 404 })
  }
}
