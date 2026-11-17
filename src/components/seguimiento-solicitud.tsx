import Link from "next/link"
import { formatDate, formatDateTime } from "@/lib/format"
import { SLA_LABEL, type SlaState } from "@/lib/domain"
import type { EtapaVista } from "@/lib/seguimiento"

export function PasosSolicitud({ etapas }: { etapas: EtapaVista[] }) {
  return (
    <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Etapas de la solicitud">
      {etapas.map((etapa) => {
        const actual = etapa.estado === "actual"
        const hecha = etapa.estado === "hecha"
        const espera = actual && etapa.id === "espera"
        return (
          <li key={etapa.id} className="min-w-32 flex-1" aria-current={actual ? "step" : undefined}>
            <div className={`mb-2 h-1.5 rounded-full ${espera ? "bg-[#EE876B]" : actual ? "bg-[#1658B0]" : hecha ? "bg-[#4FB3DB]" : "bg-[#E1EBF9]"}`} />
            <p className={`text-xs font-medium ${actual ? "text-[#1658B0]" : hecha ? "text-[#222B7C]" : "text-[#8B9597]"}`}>{etapa.label}</p>
            <p className="text-[11px] text-[#8B8C8C]">
              {etapa.fecha ? formatDate(new Date(etapa.fecha)) : etapa.estado === "pendiente" ? "Pendiente" : "Sin fecha registrada"}
            </p>
            {actual && etapa.estadoReal && etapa.estadoReal !== etapa.label ? (
              <p className="text-[11px] text-[#44546f]">{etapa.estadoReal}</p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export function FichaSeguimiento({
  codigo,
  etapas,
  responsable,
  sla,
  vence,
  paso,
  ctaHref,
}: {
  codigo: string
  etapas: EtapaVista[]
  responsable: string
  sla: SlaState
  vence: string | null
  paso: { texto: string; cta: string | null }
  ctaHref?: string
}) {
  return (
    <div className="space-y-3">
      <PasosSolicitud etapas={etapas} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>Responsable: <span className="font-medium">{responsable}</span></p>
        <p>
          SLA: <span className="font-medium">{SLA_LABEL[sla]}</span>
          {vence ? <span className="text-[#44546f]"> · vence {formatDateTime(new Date(vence))}</span> : null}
        </p>
      </div>
      <p className="text-sm text-[#15122A]">{paso.texto}</p>
      {paso.cta ? (
        <Link href={ctaHref ?? `/requerimientos/${codigo}#gestion`} className="inline-flex h-9 items-center rounded-md bg-[#1658B0] px-3 text-sm font-medium text-white hover:bg-[#222B7C]">
          {paso.cta}
        </Link>
      ) : null}
    </div>
  )
}

export function LineaEstados({
  cambios,
}: {
  cambios: { id: string; cuando: string; texto: string; autor: string }[]
}) {
  return (
    <section aria-labelledby="linea-estados" className="space-y-3">
      <h2 id="linea-estados" className="font-heading text-2xl">Cambios de estado</h2>
      {cambios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cambios de estado después del radicado.</p>
      ) : (
        <ol className="grid gap-3 border-l-2 border-[#1658B0]/30 pl-4">
          {cambios.map((cambio) => (
            <li key={cambio.id}>
              <p className="text-sm">{cambio.texto}</p>
              <p className="text-xs text-muted-foreground">{cambio.autor} · {formatDateTime(new Date(cambio.cuando))}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
