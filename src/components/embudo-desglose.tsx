"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EstadoChip } from "@/components/growth-panel"
import { IconoEtapa } from "@/components/growth-iconos"
import { desgloseEtapa, etapaCoincide, type EtapaEmbudo } from "@/lib/growth"

export type ExperimentoEmbudo = {
  id: string
  nombre: string
  etapaEmbudo: string
  estado: string
  responsable: string
}

export function EmbudoDesglose({
  etapas,
  experimentos,
  fuente,
  actualizado,
  ilustrativo,
}: {
  etapas: EtapaEmbudo[]
  experimentos: ExperimentoEmbudo[]
  fuente: string
  actualizado: string
  ilustrativo: boolean
}) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const desglose = abierta == null ? null : desgloseEtapa(etapas, abierta)
  const vinculados = desglose ? experimentos.filter((item) => etapaCoincide(desglose.nombre, item.etapaEmbudo)) : []
  return (
    <>
      <div className="mt-4 flex flex-nowrap items-end gap-1.5 overflow-x-auto">
        {etapas.map((etapa, index) => {
          const siguiente = etapas[index + 1]
          const conversion = siguiente ? desgloseEtapa(etapas, index + 1)?.desdeAnterior : null
          return (
            <div key={etapa.nombre} className="flex items-end gap-2">
              <div className="flex w-[8.6rem] shrink-0 flex-col">
                {etapa.llamada ? (
                  <p className="mb-2 rounded-lg border border-[#F5D0A9] bg-[#FFF7ED] px-2 py-1 text-center text-[11px] leading-tight text-[#C2410C]">
                    {etapa.llamada}
                    <span className="block text-[#667085]">{etapa.subllamada}</span>
                  </p>
                ) : <span className="mb-2 block h-9" aria-hidden="true" />}
                <button
                  type="button"
                  onClick={() => setAbierta(index)}
                  className={`rounded-xl p-4 text-left ${etapa.destacado ? "bg-[#FEF3C7]" : "bg-[#E7F0FB]"} hover:ring-2 hover:ring-[#1658B0]`}
                  aria-label={`Ver desglose de ${etapa.nombre}`}
                >
                  <span className="flex items-center gap-1.5 text-sm leading-tight text-[#3d4a63]">
                    <span className="text-[#1658B0]"><IconoEtapa nombre={etapa.nombre} /></span>
                    {etapa.nombre}
                  </span>
                  <span className="mt-1 block font-heading text-4xl text-[#1658B0]">{etapa.valor}</span>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white"><span className="block h-full bg-[#1658B0]" style={{ width: `${Math.min(100, etapas[0] ? (etapa.valor / etapas[0].valor) * 100 : 0)}%` }} /></span>
                </button>
              </div>
              {conversion ? (
                <div className="mb-6 flex w-9 shrink-0 flex-col items-center gap-0.5 text-[#1658B0]">
                  <span className="text-[11px] font-semibold">{conversion}</span>
                  <ArrowRightIcon className="size-4 text-[#98A2B3]" aria-hidden />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <Sheet open={desglose != null} onOpenChange={(abierto) => { if (!abierto) setAbierta(null) }}>
        <SheetContent side="right" className="z-[80] w-full overflow-y-auto bg-white sm:max-w-md">
          {desglose ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <IconoEtapa nombre={desglose.nombre} />
                  {desglose.nombre}
                </SheetTitle>
                <SheetDescription>
                  {ilustrativo ? "Datos de ejemplo. " : ""}
                  Fuente: {fuente} · Actualizado {actualizado}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid gap-3 px-4 text-sm">
                <Fila etiqueta="Cantidad" valor={String(desglose.valor)} />
                <Fila etiqueta="Conversión desde la etapa anterior" valor={desglose.desdeAnterior ?? "Es la primera etapa"} />
                <Fila etiqueta="Conversión desde el inicio" valor={desglose.desdeInicio ?? "—"} />
                <Fila etiqueta="Frente a la etapa anterior" valor={desglose.perdidas == null ? "Es la primera etapa" : desglose.perdidas >= 0 ? `Se pierden ${desglose.perdidas}` : `Hay ${Math.abs(desglose.perdidas)} más`} />
                <Fila
                  etiqueta="Periodo anterior"
                  valor={desglose.valorPrevio == null || desglose.delta == null
                    ? "Sin periodo anterior cargado"
                    : `${desglose.valor} frente a ${desglose.valorPrevio} (${desglose.delta > 0 ? "+" : ""}${desglose.delta}${desglose.deltaTexto ? `, ${desglose.deltaTexto}` : ""})`}
                />
              </dl>
              <div className="px-4 pb-6">
                <h3 className="text-sm font-medium">Experimentos de esta etapa</h3>
                {vinculados.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Ningún experimento de este ciclo apunta a esta etapa.</p> : (
                  <ul className="mt-2 grid gap-2">
                    {vinculados.map((item) => (
                      <li key={item.id} className="rounded-lg border border-[#E4E7EC] px-3 py-2">
                        <Link href={`/growth/${item.id}`} className="font-medium text-[#1658B0] hover:underline">{item.nombre}</Link>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          {item.responsable}
                          <EstadoChip estado={item.estado} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg border border-[#E4E7EC] px-3 py-2">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium text-[#15122A]">{valor}</dd>
    </div>
  )
}
