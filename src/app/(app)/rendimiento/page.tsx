import { Suspense } from "react"
import { EsqueletoRendimiento } from "@/components/rendimiento-esqueleto"
import { FiltrosRendimientoForm, NotaCalculo, TablaRendimiento, TarjetasRendimiento } from "@/components/rendimiento-panel"
import { describeWindows } from "@/lib/sla"
import { hrefRendimiento, leerFiltros } from "@/lib/rendimiento"
import { tableroRendimiento } from "@/server/rendimiento"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<EsqueletoRendimiento />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  )
}

async function Contenido({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const filtros = leerFiltros(await searchParams)
  const datos = await tableroRendimiento(actor, filtros)
  if (datos.denegado) {
    return (
      <div className="max-w-xl space-y-2">
        <h1 className="font-heading text-2xl">Rendimiento</h1>
        <p className="text-sm text-muted-foreground">El rendimiento por persona está disponible para administración, líderes y agentes.</p>
      </div>
    )
  }
  const propio = datos.alcance.tipo === "propio"
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">{propio ? "Mi rendimiento" : "Rendimiento"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">SLA, demora y tareas por persona. Los filtros se combinan y quedan en la dirección.</p>
        </div>
        <a href={hrefRendimiento("/rendimiento/exportar", datos.filtros)} className="inline-flex h-9 items-center rounded-lg border border-[#1658B0] px-3 text-sm font-medium text-[#1658B0] hover:bg-[#E1EBF9]">Exportar CSV</a>
      </div>
      <FiltrosRendimientoForm filtros={datos.filtros} opciones={datos.opciones} periodo={datos.periodo} action="/rendimiento" alcance={datos.alcance} ocultarPersona={propio} />
      <TarjetasRendimiento resumen={datos.resumen} />
      <p className="text-xs text-muted-foreground">Desplace la tabla para ver tiempos y tareas. {datos.resumen.tareasCompletadas.toLocaleString("es-CO")} tareas hechas en el periodo.</p>
      <TablaRendimiento filas={datos.filas} filtros={datos.filtros} base="/rendimiento" />
      <NotaCalculo jornada={describeWindows()} />
    </div>
  )
}
