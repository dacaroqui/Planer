import { NextResponse } from "next/server"
import { pdfInforme } from "@/lib/informe-pdf"
import { armarInforme } from "@/server/informe"
import { requireActor } from "@/server/session"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const actor = await requireActor()
  const url = new URL(request.url)
  const datos = await armarInforme(actor, {
    semana: url.searchParams.get("semana") || undefined,
    area: url.searchParams.get("area") || undefined,
    proyectoId: url.searchParams.get("proyecto") || undefined,
  })
  const buffer = await pdfInforme(datos)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe-${datos.semana}.pdf"`,
    },
  })
}
