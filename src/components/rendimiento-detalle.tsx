import Link from "next/link"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { PRIORITY_LABEL, type PriorityName } from "@/lib/domain"
import {
  hrefRendimiento,
  textoHoras,
  textoPct,
  type FilaRendimiento,
  type FiltrosRendimiento,
  type PuntoTendencia,
  type SolicitudVista,
} from "@/lib/rendimiento"

export function GraficoTendencia({ titulo, puntos }: { titulo: string; puntos: PuntoTendencia[] }) {
  const maximo = Math.max(1, ...puntos.map((punto) => punto.completados))
  const resumen = puntos.map((punto) => `${punto.etiqueta}: ${punto.completados} completados, SLA ${punto.pctSla === null ? "sin cierres" : `${Math.round(punto.pctSla)} %`}`).join(". ")
  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="text-sm font-medium">{titulo}</figcaption>
      <p className="mt-1 text-xs text-muted-foreground">La barra es la cantidad de cerrados. El porcentaje es el SLA cumplido entre esos cierres.</p>
      <div className="mt-4 grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(puntos.length, 1)}, minmax(0, 1fr))` }} role="img" aria-label={`${titulo}. ${resumen}`}>
        {puntos.map((punto) => (
          <div key={punto.clave} className="flex min-w-0 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end justify-center">
              <div className="w-3.5 rounded-t bg-[#1658B0]" style={{ height: `${Math.max(punto.completados === 0 ? 0 : 8, (punto.completados / maximo) * 100)}%` }} />
            </div>
            <span className="text-xs tabular-nums">{punto.completados}</span>
            <span className="text-[11px] tabular-nums text-[#222B7C]">{textoPct(punto.pctSla)}</span>
            <span className="truncate text-[11px] text-muted-foreground">{punto.etiqueta}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead><tr><th>Corte</th><th>Completados</th><th>SLA</th></tr></thead>
        <tbody>
          {puntos.map((punto) => (
            <tr key={punto.clave}><td>{punto.etiqueta}</td><td>{punto.completados}</td><td>{textoPct(punto.pctSla)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function ResumenPersona({ fila }: { fila: FilaRendimiento }) {
  const datos = [
    ["Asignados", textoEnteroSeguro(fila.asignados)],
    ["Completados", textoEnteroSeguro(fila.completados)],
    ["Pendientes", textoEnteroSeguro(fila.pendientes)],
    ["Cumplimiento", textoPct(fila.cumplimiento)],
    ["Dentro de SLA", `${textoEnteroSeguro(fila.dentroSla)} · ${textoPct(fila.pctDentroSla)}`],
    ["Fuera de SLA", textoEnteroSeguro(fila.fueraSla)],
    ["Promedio", textoHoras(fila.horasPromedio)],
    ["Mediana", textoHoras(fila.horasMediana)],
    ["Demora", textoHoras(fila.horasDemora)],
    ["SLA abierto", textoPct(fila.slaAbiertoPromedio)],
    ["En riesgo", textoEnteroSeguro(fila.enRiesgo)],
    ["Vencidos", textoEnteroSeguro(fila.vencidos)],
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {datos.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="rounded-xl border border-border bg-card px-3 py-2">
          <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
          <dd className="text-lg font-medium text-[#1658B0]">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function textoEnteroSeguro(valor: number) {
  return valor.toLocaleString("es-CO")
}

export function ListaSolicitudes({ solicitudes }: { solicitudes: SolicitudVista[] }) {
  if (solicitudes.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No tiene requerimientos en este corte.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[48rem] text-sm">
        <caption className="sr-only">Requerimientos del corte</caption>
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Clave</th>
            <th className="px-3 py-2">Resumen</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Prioridad</th>
            <th className="px-3 py-2">SLA</th>
            <th className="px-3 py-2 text-right">% SLA</th>
            <th className="px-3 py-2 text-right">Horas hábiles</th>
            <th className="px-3 py-2 text-right">Demora</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.id} className="border-t border-border">
              <td className="px-3 py-2">
                <Link href={`/requerimientos/${solicitud.code}`} className="font-medium text-[#1658B0] hover:underline">{solicitud.code}</Link>
              </td>
              <td className="max-w-xs truncate px-3 py-2">{solicitud.title}</td>
              <td className="px-3 py-2"><EstadoBadge status={solicitud.status} /></td>
              <td className="px-3 py-2">{PRIORITY_LABEL[solicitud.priority as PriorityName] ?? solicitud.priority}</td>
              <td className="px-3 py-2"><SlaBadge state={solicitud.state} /></td>
              <td className="px-3 py-2 text-right tabular-nums">{textoPct(solicitud.ratio * 100)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{textoHoras(solicitud.horas)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{textoHoras(solicitud.demora)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function VolverRendimiento({ filtros }: { filtros: FiltrosRendimiento }) {
  return <Link href={hrefRendimiento("/rendimiento", { ...filtros, personas: [] })} className="text-sm text-[#1658B0] hover:underline">Volver al tablero</Link>
}
