import { Suspense } from "react"
import { EsqueletoRendimiento } from "@/components/rendimiento-esqueleto"
import { GraficoTendencia, ListaSolicitudes, ResumenPersona, VolverRendimiento } from "@/components/rendimiento-detalle"
import { FiltrosRendimientoForm, NotaCalculo } from "@/components/rendimiento-panel"
import { NombreMiga } from "@/components/migas"
import { describeWindows } from "@/lib/sla"
import { hrefRendimiento, leerFiltros } from "@/lib/rendimiento"
import { detalleRendimiento } from "@/server/rendimiento"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<EsqueletoRendimiento />}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Contenido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const { id } = await params
  const filtros = leerFiltros(await searchParams)
  const datos = await detalleRendimiento(actor, id, filtros)
  if (datos.denegado) {
    return (
      <div className="max-w-xl space-y-2">
        <h1 className="font-heading text-2xl">Rendimiento</h1>
        <p className="text-sm text-muted-foreground">El rendimiento por persona está disponible para administración, líderes y agentes.</p>
      </div>
    )
  }
  if (!datos.encontrado) {
    return (
      <div className="max-w-xl space-y-3">
        <VolverRendimiento filtros={filtros} />
        <h1 className="font-heading text-2xl">Rendimiento</h1>
        <p className="text-sm text-muted-foreground">No puede ver el rendimiento de esa persona.</p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <NombreMiga nombre={datos.persona.nombre} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <VolverRendimiento filtros={datos.filtros} />
          <h1 className="mt-2 font-heading text-2xl">{datos.persona.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{datos.persona.area} · {datos.persona.equipos} · {datos.persona.email}</p>
        </div>
        <a href={hrefRendimiento("/rendimiento/exportar", datos.filtros)} className="inline-flex h-9 items-center rounded-lg border border-[#1658B0] px-3 text-sm font-medium text-[#1658B0] hover:bg-[#E1EBF9]">Exportar CSV</a>
      </div>
      <FiltrosRendimientoForm filtros={datos.filtros} opciones={datos.opciones} periodo={datos.periodo} action={`/rendimiento/${datos.persona.id}`} alcance={datos.alcance} ocultarPersona />
      <ResumenPersona fila={datos.fila} />
      <div className="grid gap-4 xl:grid-cols-2">
        <GraficoTendencia titulo="Completados y SLA por semana" puntos={datos.semanas} />
        <GraficoTendencia titulo="Completados y SLA por mes" puntos={datos.meses} />
      </div>
      <section className="space-y-2">
        <h2 className="font-heading text-xl">Requerimientos del corte</h2>
        <ListaSolicitudes solicitudes={datos.solicitudes} />
      </section>
      <p className="text-sm text-muted-foreground">
        Tareas hechas: {datos.fila.tareasSemana.toLocaleString("es-CO")} esta semana, {datos.fila.tareasMes.toLocaleString("es-CO")} este mes y {datos.fila.tareasAnio.toLocaleString("es-CO")} este año.
        En el periodo: {datos.fila.tareasAsignadas.toLocaleString("es-CO")} asignadas, {datos.fila.tareasCompletadas.toLocaleString("es-CO")} hechas y {datos.fila.tareasSinHacer.toLocaleString("es-CO")} sin hacer.
      </p>
      <NotaCalculo jornada={describeWindows()} />
    </div>
  )
}
