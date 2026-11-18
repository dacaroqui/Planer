import Link from "next/link"
import { EstadoBadge } from "@/components/insignias"
import type { FilaPersona } from "@/server/personas"

export function PersonasLista({ filas }: { filas: FilaPersona[] }) {
  if (filas.length === 0) {
    return <p className="rounded-lg border border-[#E4E7EC] bg-white p-6 text-sm text-muted-foreground">Nadie coincide con esos filtros.</p>
  }
  return (
    <div className="space-y-3">
      {filas.map((fila) => {
        const vacia = fila.abiertos + fila.tareas === 0
        return (
          <details key={fila.id} className="rounded-lg border border-[#E4E7EC] bg-white" open={filas.length === 1 || (!vacia && fila.vencidos > 0)}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="block font-medium">{fila.nombre}</span>
                <span className="text-xs text-muted-foreground">{fila.area} · {fila.equipos}</span>
              </span>
              {vacia ? <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs text-[#3d4a63]">Sin tareas asignadas</span> : (
                <span className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[#E7F0FB] px-2.5 py-1 text-[#1658B0]">{fila.abiertos} requerimientos</span>
                  <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1">{fila.tareas} tareas</span>
                  {fila.vencidos > 0 ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">{fila.vencidos} vencidos</span> : null}
                </span>
              )}
            </summary>
            {vacia ? <p className="border-t border-[#E4E7EC] px-4 py-3 text-sm text-muted-foreground">Sin tareas asignadas.</p> : (
              <div className="overflow-x-auto border-t border-[#E4E7EC]">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Clave</th>
                      <th className="px-3 py-2 font-medium">Resumen</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-4 py-2 font-medium">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fila.items.map((item) => (
                      <tr key={item.id} className="border-t border-[#F3F4F6]">
                        <td className="px-4 py-2">{item.href ? <Link href={item.href} className="inline-flex rounded-full bg-[#E7F0FB] px-2 py-0.5 text-xs font-medium text-[#1658B0] hover:underline">{item.clave}</Link> : item.clave}</td>
                        <td className="px-3 py-2">{item.tipo === "tarea" ? <span className="mr-2 text-xs text-muted-foreground">Tarea</span> : null}{item.resumen}</td>
                        <td className="px-3 py-2"><EstadoBadge status={item.estado} etiqueta={item.etiqueta} /></td>
                        <td className="px-4 py-2">{item.sla ?? "—"}{item.vencido && !item.sla ? " · vencida" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        )
      })}
    </div>
  )
}
