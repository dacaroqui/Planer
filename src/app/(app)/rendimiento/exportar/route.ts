import { filasACsv, leerFiltros } from "@/lib/rendimiento"
import { tableroRendimiento } from "@/server/rendimiento"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const actor = await requireActor()
  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams.entries())
  const repetidos = url.searchParams.getAll("persona")
  const filtros = leerFiltros({ ...params, persona: repetidos.length > 1 ? repetidos : params.persona })
  const datos = await tableroRendimiento(actor, filtros)
  if (datos.denegado) {
    return new Response("No tiene permiso para ver el rendimiento.", { status: 403 })
  }
  return new Response(filasACsv(datos.filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"rendimiento.csv\"",
      "Cache-Control": "private, no-store",
    },
  })
}
