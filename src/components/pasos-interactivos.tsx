"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CamposMovimiento } from "@/components/campos-movimiento"
import { Button } from "@/components/ui/button"
import { clasificarEtapas, type PasoMovimiento } from "@/lib/pasos-accion"
import type { EtapaVista } from "@/lib/seguimiento"
import { debePedirResponsable, type MovimientoTablero } from "@/lib/tablero-movimiento"
import { transicionarAction } from "@/server/actions"

export function PasosInteractivos({
  codigo,
  etapas,
  status,
  anterior,
  permitidas,
  catalogo,
  agentes,
  assigneeId,
  committedDate,
}: {
  codigo: string
  etapas: EtapaVista[]
  status: string
  anterior: string | null
  permitidas: PasoMovimiento[]
  catalogo: PasoMovimiento[]
  agentes: { id: string; name: string }[]
  assigneeId: string | null
  committedDate: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [elegido, setElegido] = useState("")
  const [motivo, setMotivo] = useState("")
  const [entrega, setEntrega] = useState("")
  const [responsableId, setResponsableId] = useState(assigneeId ?? "")
  const [fecha, setFecha] = useState(committedDate ?? "")
  const [resolucion, setResolucion] = useState("RESUELTO")
  const clases = clasificarEtapas({ status, anterior, etapas, permitidas, catalogo })
  const paso = clases.find((item) => item.id === abierta)
  const movimiento = paso?.permitidas.find((item) => item.name === elegido) ?? paso?.permitidas[0] ?? null
  const comoTablero: MovimientoTablero | null = movimiento
    ? { name: movimiento.name, to: movimiento.to, column: "", requiresComment: movimiento.requiresComment, requiresDelivery: movimiento.requiresDelivery, requiresAssignee: movimiento.requiresAssignee, requiresCommittedDate: movimiento.requiresCommittedDate }
    : null

  function abrir(id: string, opciones: PasoMovimiento[]) {
    setAbierta(id)
    setElegido(opciones[0]?.name ?? "")
    setMotivo("")
    setEntrega("")
    setResponsableId(assigneeId ?? "")
    setFecha(committedDate ?? "")
  }

  function confirmar() {
    if (!movimiento) return
    const data = new FormData()
    data.set("code", codigo)
    data.set("name", movimiento.name)
    data.set("comment", motivo)
    data.set("deliveryUrl", entrega)
    if (responsableId) data.set("assigneeId", responsableId)
    if (fecha) data.set("committedDate", fecha)
    if (movimiento.to === "CERRADO") data.set("resolution", resolucion)
    start(async () => {
      const result = await transicionarAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || `${codigo} cambió de estado.`)
      setAbierta(null)
      router.refresh()
    })
  }

  return (
    <div>
      <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Etapas de la solicitud">
        {etapas.map((etapa) => {
          const info = clases.find((item) => item.id === etapa.id)
          const actual = etapa.estado === "actual"
          const hecha = etapa.estado === "hecha"
          const espera = actual && etapa.id === "espera"
          const barra = espera ? "bg-[#EE876B]" : actual ? "bg-[#1658B0]" : hecha ? "bg-[#4FB3DB]" : "bg-[#E1EBF9]"
          const texto = actual ? "text-[#1658B0]" : hecha ? "text-[#222B7C]" : "text-[#8B9597]"
          const cuerpo = (
            <>
              <div className={`mb-2 h-1.5 rounded-full ${barra}`} />
              <p className={`text-xs font-medium ${texto}`}>{etapa.label}</p>
              <p className="text-[11px] text-[#8B8C8C]">{actual && etapa.estadoReal && etapa.estadoReal !== etapa.label ? etapa.estadoReal : info?.motivo && !info.permitidas.length ? info.motivo : " "}</p>
            </>
          )
          if (!info || info.permitidas.length === 0) {
            return (
              <li key={etapa.id} className="min-w-32 flex-1 opacity-80" aria-current={actual ? "step" : undefined} title={info?.motivo ?? undefined}>
                {cuerpo}
              </li>
            )
          }
          return (
            <li key={etapa.id} className="min-w-32 flex-1">
              <button type="button" className="w-full rounded-md text-left hover:bg-[#F4F7FC]" aria-expanded={abierta === etapa.id} title={`Mover a ${etapa.label}`} onClick={() => abrir(etapa.id, info.permitidas)}>
                {cuerpo}
              </button>
            </li>
          )
        })}
      </ol>
      {paso && movimiento && comoTablero ? (
        <div className="mt-3 rounded-lg border border-[#E4E7EC] bg-[#F8FAFD] p-3" role="dialog" aria-label={`Confirmar ${movimiento.name}`}>
          <p className="text-sm font-medium">Confirmar «{movimiento.name}»</p>
          <p className="mt-1 text-xs text-muted-foreground">El comentario es opcional, salvo que el paso lo pida.</p>
          {paso.permitidas.length > 1 ? (
            <div className="mt-2 grid gap-1">
              {paso.permitidas.map((item) => (
                <label key={item.name} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="paso" checked={elegido === item.name} onChange={() => setElegido(item.name)} />
                  {item.name}
                </label>
              ))}
            </div>
          ) : null}
          <div className="mt-2 grid gap-2">
            <CamposMovimiento
              prefijo="paso"
              movimiento={comoTablero}
              pideResponsable={debePedirResponsable({ assigneeId }, comoTablero)}
              pideFecha={Boolean(comoTablero.requiresCommittedDate && !committedDate)}
              agentes={agentes}
              responsableId={responsableId}
              onResponsable={setResponsableId}
              fecha={fecha}
              onFecha={setFecha}
              resolucion={resolucion}
              onResolucion={setResolucion}
              motivo={motivo}
              onMotivo={setMotivo}
              entrega={entrega}
              onEntrega={setEntrega}
            />
            {!comoTablero.requiresComment && comoTablero.to !== "CERRADO" ? (
              <label className="grid gap-1 text-sm">
                Comentario
                <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" placeholder="Opcional." />
              </label>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" disabled={pending} onClick={confirmar}>Confirmar</Button>
            <Button type="button" variant="outline" onClick={() => setAbierta(null)}>Cancelar</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
