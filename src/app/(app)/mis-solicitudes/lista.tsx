"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FichaSeguimiento } from "@/components/seguimiento-solicitud"
import { Button } from "@/components/ui/button"
import type { SlaState } from "@/lib/domain"
import type { EtapaVista } from "@/lib/seguimiento"

export type Solicitud = {
  code: string
  title: string
  status: string
  assignee: string
  sla: SlaState
  vence: string | null
  paso: { texto: string; cta: string | null }
  etapas: EtapaVista[]
  cerrado: boolean
  hecho?: string | null
}

export function ListaMisSolicitudes({ items }: { items: Solicitud[] }) {
  const [filtro, setFiltro] = useState<"abiertos" | "cerrados">("abiertos")
  const visibles = useMemo(() => items.filter((item) => filtro === "cerrados" ? item.cerrado : !item.cerrado), [items, filtro])
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={filtro === "abiertos" ? "default" : "outline"} onClick={() => setFiltro("abiertos")}>Abiertos</Button>
        <Button type="button" size="sm" variant={filtro === "cerrados" ? "default" : "outline"} onClick={() => setFiltro("cerrados")}>Cerrados</Button>
      </div>
      {visibles.length === 0 ? <p className="text-sm text-muted-foreground">No tiene solicitudes en este grupo.</p> : (
        <div className="grid gap-3">
          {visibles.map((item) => (
            <article key={item.code} className="rounded-xl border border-[#dfe1e6] bg-white px-4 py-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/requerimientos/${item.code}`} className="font-medium text-[#15122A] hover:underline">{item.title}</Link>
                <Link href={`/requerimientos/${item.code}`} className="text-xs font-medium text-[#1658B0] hover:underline">{item.code}</Link>
              </div>
              {item.hecho ? <p className="mb-3 rounded-lg bg-[#F4F8FE] px-3 py-2 text-sm"><span className="font-medium">Qué se hizo. </span>{item.hecho}</p> : null}
              <FichaSeguimiento
                codigo={item.code}
                etapas={item.etapas}
                responsable={item.assignee}
                sla={item.sla}
                vence={item.vence}
                paso={item.paso}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
