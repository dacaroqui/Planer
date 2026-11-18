"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { asignarAction } from "@/server/actions"
import { Compositor } from "@/components/compositor"
import { Cronologia, hace, type EntradaLinea } from "@/components/cronologia-vista"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Elegir } from "@/components/ui/elegir"
import { SLA_LABEL, type SlaState, type TeamName } from "@/lib/domain"

export type FilaBandeja = {
  code: string
  title: string
  requester: string
  lastActor: string
  lastAt: string | null
  sla: SlaState
  assignee: string
  puedeAsignar: boolean
  puedeResponder: boolean
}

const TABS = [
  ["responder", "Por responder"],
  ["sin-asignar", "Sin asignar"],
  ["mios", "Asignados a mí"],
  ["espera", "En espera del solicitante"],
  ["vencer", "Por vencer / Vencidos"],
] as const

export function BandejaPanel({
  tab,
  conteos,
  filas,
  query,
  empresas,
  responsables,
  equipos,
  soloLectura,
  detalle,
}: {
  tab: string
  conteos: Record<string, number>
  filas: FilaBandeja[]
  query: Record<string, string>
  empresas: { id: string; name: string }[]
  responsables: { id: string; name: string }[]
  equipos: TeamName[]
  soloLectura: boolean
  detalle: null | {
    code: string
    title: string
    entradas: EntradaLinea[]
    puedePublica: boolean
    puedeNota: boolean
    puedeAdjuntar: boolean
    esSolicitante: boolean
    tareas: { id: string; title: string }[]
    agentes: { id: string; name: string }[]
    puedeAsignar: boolean
  }
}) {
  const router = useRouter()
  function ir(parcial: Record<string, string | undefined>) {
    const next = new URLSearchParams()
    const base = { ...query, ...parcial }
    for (const [clave, valor] of Object.entries(base)) {
      if (valor) next.set(clave, valor)
    }
    const texto = next.toString()
    router.push(texto ? `/bandeja?${texto}` : "/bandeja")
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[#E4E7EC]" role="tablist">
        {TABS.map(([id, etiqueta]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "border-b-2 border-[#1658B0] px-2 pb-2 text-sm font-medium text-[#1658B0]" : "px-2 pb-2 text-sm text-muted-foreground"} onClick={() => ir({ tab: id, codigo: undefined })}>
            {etiqueta} <span className="ml-1 rounded-full bg-[#F3F4F6] px-1.5 text-xs">{conteos[id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Elegir className="w-40" ariaLabel="Equipo" value={query.equipo ?? ""} onValueChange={(valor) => ir({ equipo: valor || undefined })} placeholder="Equipo" opciones={[{ value: "", label: "Equipo" }, ...equipos.map((equipo) => ({ value: equipo, label: equipo === "DESARROLLO" ? "Desarrollo" : "Marketing" }))]} />
        <Elegir className="w-44" ariaLabel="Empresa" value={query.empresa ?? ""} onValueChange={(valor) => ir({ empresa: valor || undefined })} placeholder="Empresa" opciones={[{ value: "", label: "Empresa" }, ...empresas.map((empresa) => ({ value: empresa.id, label: empresa.name }))]} />
        <Elegir className="w-40" ariaLabel="Prioridad" value={query.prioridad ?? ""} onValueChange={(valor) => ir({ prioridad: valor || undefined })} placeholder="Prioridad" opciones={[{ value: "", label: "Prioridad" }, { value: "CRITICA", label: "Crítica" }, { value: "ALTA", label: "Alta" }, { value: "MEDIA", label: "Media" }, { value: "BAJA", label: "Baja" }]} />
        <Elegir className="w-48" ariaLabel="Responsable" value={query.responsable ?? ""} onValueChange={(valor) => ir({ responsable: valor || undefined })} placeholder="Responsable" opciones={[{ value: "", label: "Responsable" }, ...responsables.map((persona) => ({ value: persona.id, label: persona.name }))]} />
        <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <input type="checkbox" checked={query.mios === "1"} onChange={(event) => ir({ mios: event.target.checked ? "1" : undefined })} /> Solo míos
        </label>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-[#F0F2F5]">
              <th className="px-4 py-3 font-medium">Solicitud</th>
              <th className="px-3 py-3 font-medium">Última entrada</th>
              <th className="px-3 py-3 font-medium">SLA</th>
              <th className="px-3 py-3 font-medium">Responsable</th>
              <th className="px-3 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay solicitudes en esta bandeja.</td></tr>
            ) : filas.map((fila) => (
              <tr key={fila.code} className="cursor-pointer border-b border-[#F0F2F5] last:border-0 hover:bg-[#F8FAFC]" onClick={() => ir({ codigo: fila.code })}>
                <td className="px-4 py-3">
                  <span className="font-medium text-[#1658B0]">{fila.code}</span>
                  <span className="mt-0.5 block">{fila.title}</span>
                  <span className="text-xs text-muted-foreground">{fila.requester}</span>
                </td>
                <td className="px-3 py-3 text-xs">{fila.lastActor}<span className="block text-muted-foreground">{hace(fila.lastAt)}</span></td>
                <td className="px-3 py-3"><span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs">{SLA_LABEL[fila.sla]}</span></td>
                <td className="px-3 py-3">{fila.assignee}</td>
                <td className="px-3 py-3">
                  <span className="flex gap-2">
                    {fila.puedeResponder && !soloLectura ? <button type="button" className="text-[#1658B0] underline" onClick={(event) => { event.stopPropagation(); ir({ codigo: fila.code }) }}>Responder</button> : null}
                    {fila.puedeAsignar ? <button type="button" className="text-[#1658B0] underline" onClick={(event) => { event.stopPropagation(); ir({ codigo: fila.code }) }}>Asignar</button> : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sheet open={Boolean(detalle)} onOpenChange={(valor) => { if (!valor) ir({ codigo: undefined }) }}>
        <SheetContent side="right" className="w-full bg-white sm:max-w-xl">
          {detalle ? (
            <>
              <SheetHeader>
                <SheetTitle>{detalle.code}</SheetTitle>
                <p className="text-sm text-muted-foreground">{detalle.title}</p>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                <Cronologia entradas={detalle.entradas} />
                {detalle.puedeAsignar && detalle.agentes.length > 0 ? <AsignarRapido code={detalle.code} agentes={detalle.agentes} /> : null}
                <Compositor code={detalle.code} puedePublica={detalle.puedePublica && !soloLectura} puedeNota={detalle.puedeNota && !soloLectura} puedeAdjuntar={detalle.puedeAdjuntar && !soloLectura} esSolicitante={detalle.esSolicitante} tareas={detalle.tareas} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AsignarRapido({ code, agentes }: { code: string; agentes: { id: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <form className="flex gap-2" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("code", code)
      start(async () => {
        const result = await asignarAction(data)
        if (!result.ok) toast.error(result.error)
        else {
          toast.success(result.message || "Asignado.")
          router.refresh()
        }
      })
    }}>
      <select name="assigneeId" aria-label="Asignar responsable" className="h-10 flex-1 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm" required>
        <option value="">Asignar a…</option>
        {agentes.map((agente) => <option key={agente.id} value={agente.id}>{agente.name}</option>)}
      </select>
      <button type="submit" disabled={pending} className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm">Asignar</button>
    </form>
  )
}
