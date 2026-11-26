import Link from "next/link"
import { KpiInline } from "@/components/kpi-inline"
import { Chispa } from "@/components/objetivos-ui"
import { aprobarMetaAction, medicionAction, proponerMetaAction } from "@/server/objetivos-actions"

type KpiVista = {
  id: string
  nombre: string
  unidad: string
  tipo: "PRINCIPAL" | "APOYO"
  actual: number | null
  meta: number | null
  estadoMeta: "EN_LINEA_BASE" | "PROPUESTA" | "APROBADA"
  bloqueado: boolean
  motivoBloqueo: string
  tendencia: number[]
  mediciones: unknown[]
  _count?: { tareas: number }
}

export function PanelPersona({ kpis, puedeAprobar, propio, puedeEditar = propio || puedeAprobar }: { kpis: KpiVista[]; puedeAprobar: boolean; propio: boolean; puedeEditar?: boolean }) {
  return (
    <ul className="grid gap-3">
      {kpis.length === 0 ? <li className="text-sm text-muted-foreground">Todavía no hay KPIs. Un principal y hasta cuatro de apoyo.</li> : kpis.map((kpi) => (
        <li key={kpi.id} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <KpiInline kpi={{ id: kpi.id, nombre: kpi.nombre, unidad: kpi.unidad, actual: kpi.actual, meta: kpi.meta, estado: kpi.estadoMeta, actividades: kpi._count?.tareas ?? 0, bloqueado: kpi.bloqueado, motivo: kpi.motivoBloqueo }} puedeEditar={puedeEditar} puedeMeta={puedeAprobar} />
              <p className="mt-1 text-xs text-muted-foreground">{kpi.tipo === "PRINCIPAL" ? "Principal" : "Apoyo"} · {kpi.mediciones.length} mediciones · <Link href={`/kpis/${kpi.id}/editar`} className="text-[#1658B0]">Ficha</Link></p>
            </div>
            <Chispa valores={kpi.tendencia} />
          </div>
          {propio ? (
            <form action={medicionAction} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="kpiId" value={kpi.id} />
              <input name="fecha" type="date" lang="es-CO" aria-label="Fecha de la medición" className="h-10 rounded-lg border border-[#E4E7EC] px-2 text-sm" />
              <input name="valor" required inputMode="decimal" aria-label="Valor medido" placeholder="Valor" className="h-10 w-28 rounded-lg border border-[#E4E7EC] px-2 text-sm" />
              <input name="nota" aria-label="Nota" placeholder="Nota" className="h-10 rounded-lg border border-[#E4E7EC] px-2 text-sm" />
              <button className="h-10 rounded-lg border border-[#1658B0] px-3 text-sm text-[#1658B0]" type="submit">Registrar</button>
            </form>
          ) : null}
          {propio && kpi.estadoMeta === "EN_LINEA_BASE" ? (
            <form action={proponerMetaAction} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="kpiId" value={kpi.id} />
              <input name="meta" required inputMode="decimal" aria-label="Meta propuesta" placeholder="Meta propuesta" className="h-10 w-36 rounded-lg border border-[#E4E7EC] px-2 text-sm" />
              <button className="h-10 rounded-lg bg-[#1658B0] px-3 text-sm text-white" type="submit">Proponer meta</button>
              {kpi.mediciones.length < 3 ? <span className="text-xs text-muted-foreground">Faltan {3 - kpi.mediciones.length} mediciones de la línea base.</span> : null}
            </form>
          ) : null}
          {puedeAprobar && kpi.estadoMeta === "PROPUESTA" ? (
            <form action={aprobarMetaAction} className="mt-2">
              <input type="hidden" name="kpiId" value={kpi.id} />
              <button className="h-10 rounded-lg bg-[#222B7C] px-3 text-sm text-white" type="submit">Aprobar meta</button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
