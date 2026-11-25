import { libroHojas } from "@/lib/xlsx-minimo"
import { matrizExportable } from "@/server/objetivos"
import { requireActor } from "@/server/session"

export async function GET() {
  const actor = await requireActor()
  const hojas = await matrizExportable(actor)
  const libro = libroHojas([
    { nombre: "Matriz", filas: hojas.matriz },
    { nombre: "KPIs por persona", filas: hojas.personas },
    { nombre: "KPIs por área", filas: hojas.areas },
  ])
  return new Response(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"objetivos.xlsx\"",
    },
  })
}
