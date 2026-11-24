import { ESTADO_TAREA_LABEL, filtrarPlan, textoFechas } from "@/lib/plan-trabajo"
import { filasExportables, libroXlsx } from "@/lib/xlsx-minimo"
import { listarPlan } from "@/server/plan-trabajo"
import { requireActor } from "@/server/session"

export async function GET(request: Request) {
  const actor = await requireActor()
  const url = new URL(request.url)
  const filas = filtrarPlan(await listarPlan(actor), {
    q: url.searchParams.get("q") ?? "",
    area: url.searchParams.get("area") ?? "",
    persona: url.searchParams.get("persona") ?? "",
    estado: url.searchParams.get("estado") ?? "",
    proyecto: url.searchParams.get("proyecto") ?? "",
    sinAsignar: url.searchParams.get("sinAsignar") === "1",
    bloqueadas: url.searchParams.get("bloqueadas") === "1",
  })
  const libro = libroXlsx(filasExportables(filas.map((fila) => ({
    proyecto: fila.proyecto,
    area: fila.area,
    actividad: fila.actividad,
    responsable: fila.responsable,
    participantes: fila.participantes,
    estado: ESTADO_TAREA_LABEL[fila.estado],
    bloqueo: fila.bloqueo,
    fechas: textoFechas(fila),
  }))))
  return new Response(new Uint8Array(libro), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"plan-de-trabajo.xlsx\"",
    },
  })
}
