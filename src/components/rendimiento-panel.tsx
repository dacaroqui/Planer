import Link from "next/link"
import {
  hrefRendimiento,
  textoEntero,
  textoHoras,
  textoPct,
  type FilaRendimiento,
  type FiltrosRendimiento,
  type OrdenRendimiento,
  type ResumenRendimiento,
} from "@/lib/rendimiento"

export { FiltrosRendimientoForm } from "@/components/rendimiento-filtros"

const COLUMNAS: Array<{ clave: OrdenRendimiento; etiqueta: string; titulo: string }> = [
  { clave: "asignados", etiqueta: "Asignados", titulo: "Requerimientos a su cargo durante el periodo" },
  { clave: "completados", etiqueta: "Completados", titulo: "Cerrados durante el periodo" },
  { clave: "pendientes", etiqueta: "Pendientes", titulo: "Los que no se cerraron en el periodo" },
  { clave: "cumplimiento", etiqueta: "%", titulo: "Completados sobre asignados" },
  { clave: "dentroSla", etiqueta: "Dentro", titulo: "Dentro del SLA" },
  { clave: "fueraSla", etiqueta: "Fuera", titulo: "Incumplidos o vencidos" },
  { clave: "pctDentroSla", etiqueta: "% SLA", titulo: "Porcentaje dentro del SLA" },
  { clave: "horasPromedio", etiqueta: "Promedio", titulo: "Horas hábiles promedio de resolución" },
  { clave: "horasMediana", etiqueta: "Mediana", titulo: "Mediana de horas hábiles de resolución" },
  { clave: "horasDemora", etiqueta: "Demora", titulo: "Horas hábiles promedio por encima del SLA, solo en los que se pasaron" },
  { clave: "slaAbiertoPromedio", etiqueta: "SLA abierto", titulo: "Porcentaje promedio del SLA ya consumido en los abiertos" },
  { clave: "enRiesgo", etiqueta: "En riesgo", titulo: "Abiertos que ya consumieron más del 80 % del SLA y todavía no vencen" },
  { clave: "vencidos", etiqueta: "Vencidos", titulo: "Abiertos con el SLA de solución vencido" },
  { clave: "tareasSemana", etiqueta: "Tar. semana", titulo: "Tareas hechas en la semana calendario de Colombia" },
  { clave: "tareasMes", etiqueta: "Tar. mes", titulo: "Tareas hechas en el mes calendario de Colombia" },
  { clave: "tareasAnio", etiqueta: "Tar. año", titulo: "Tareas hechas en el año calendario de Colombia" },
  { clave: "tareasAsignadas", etiqueta: "Tar. asig.", titulo: "Tareas que se le asignaron en el periodo" },
  { clave: "tareasCompletadas", etiqueta: "Tar. hechas", titulo: "Tareas hechas en el periodo" },
  { clave: "tareasSinHacer", etiqueta: "Tar. sin hacer", titulo: "Tareas asignadas en el periodo que no quedaron hechas" },
]

function valor(fila: FilaRendimiento, clave: OrdenRendimiento) {
  const dato = fila[clave]
  if (typeof dato === "string") return dato
  if (clave === "cumplimiento" || clave === "pctDentroSla" || clave === "slaAbiertoPromedio") return textoPct(dato)
  if (clave === "horasPromedio" || clave === "horasMediana" || clave === "horasDemora") return textoHoras(dato)
  return textoEntero(dato ?? 0)
}

function siguienteDir(filtros: FiltrosRendimiento, clave: OrdenRendimiento) {
  if (filtros.orden !== clave) return clave === "nombre" ? "asc" as const : "desc" as const
  return filtros.dir === "asc" ? "desc" as const : "asc" as const
}

export function TarjetasRendimiento({ resumen }: { resumen: ResumenRendimiento }) {
  const tarjetas = [
    ["Personas", textoEntero(resumen.personas), "En este corte"],
    ["Asignados", textoEntero(resumen.asignados), "A cargo en el periodo"],
    ["Completados", textoEntero(resumen.completados), `${textoEntero(resumen.pendientes)} pendientes`],
    ["Cumplimiento", textoPct(resumen.cumplimiento), "Cerrados sobre asignados"],
    ["Dentro de SLA", textoPct(resumen.pctDentroSla), `${textoEntero(resumen.dentroSla)} dentro · ${textoEntero(resumen.fueraSla)} fuera`],
    ["Tiempo promedio", textoHoras(resumen.horasPromedio), `Mediana ${textoHoras(resumen.horasMediana)} · demora ${textoHoras(resumen.horasDemora)}`],
    ["SLA de abiertos", textoPct(resumen.slaAbiertoPromedio), `${textoEntero(resumen.enRiesgo)} en riesgo (>80 %)`],
    ["Vencidos", textoEntero(resumen.vencidos), "Abiertos con SLA vencido"],
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tarjetas.map(([etiqueta, valorTarjeta, detalle]) => (
        <article key={etiqueta} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{etiqueta}</p>
          <p className="font-heading text-3xl text-[#1658B0]">{valorTarjeta}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
        </article>
      ))}
    </div>
  )
}

export function TablaRendimiento({
  filas,
  filtros,
  base,
}: {
  filas: FilaRendimiento[]
  filtros: FiltrosRendimiento
  base: string
}) {
  if (filas.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Nadie de este alcance entra en el corte.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[92rem] border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Rendimiento por persona</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" aria-sort={filtros.orden === "nombre" ? (filtros.dir === "asc" ? "ascending" : "descending") : "none"} className="sticky left-0 z-20 bg-card px-3 py-2 text-left">
              <Link className="underline-offset-2 hover:underline" href={hrefRendimiento(base, filtros, { orden: "nombre", dir: siguienteDir(filtros, "nombre") })}>Persona</Link>
            </th>
            {COLUMNAS.map((columna) => (
              <th key={columna.clave} scope="col" title={columna.titulo} aria-sort={filtros.orden === columna.clave ? (filtros.dir === "asc" ? "ascending" : "descending") : "none"} className="whitespace-nowrap px-3 py-2 text-right">
                <Link className="underline-offset-2 hover:underline" href={hrefRendimiento(base, filtros, { orden: columna.clave, dir: siguienteDir(filtros, columna.clave) })}>{columna.etiqueta}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className="group border-t border-border hover:bg-[#F4F7FC]">
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium group-hover:bg-[#F4F7FC]">
                <Link href={hrefRendimiento(`/rendimiento/${fila.id}`, { ...filtros, personas: [] })} className="text-[#1658B0] hover:underline">{fila.nombre}</Link>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{fila.area} · {fila.equipos}</span>
              </th>
              {COLUMNAS.map((columna) => (
                <td key={columna.clave} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{valor(fila, columna.clave)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NotaCalculo({ jornada }: { jornada: string }) {
  return (
    <details className="text-sm text-muted-foreground">
      <summary className="cursor-pointer text-[#1658B0]">Cómo se calcula</summary>
      <p className="mt-2 max-w-3xl leading-relaxed">
        Cada fila es la persona responsable. Un requerimiento entra si lo tuvo a cargo en el corte: se creó antes de que el periodo terminara y no se había resuelto antes de que empezara. Completado es el estado Cerrado. Rechazado y cancelado no entran, porque el SLA no les aplica. Las horas son hábiles ({jornada}) y descuentan las pausas, con el mismo cálculo de la ficha. En riesgo es un abierto que ya usó más del 80 % del SLA y todavía no vence. Las tareas de semana, mes y año son las hechas en el calendario de Colombia al consultar. Asignadas, hechas y sin hacer siguen el periodo: sin hacer son las que se le asignaron en el corte y no quedaron hechas.
      </p>
    </details>
  )
}
