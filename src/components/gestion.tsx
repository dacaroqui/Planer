"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { adjuntarAction, asignarAction, comentarAction, deshacerTransicionAction, guardarFechaEntregaAction, transicionarAction, type ActionResult } from "@/server/actions"
import { Elegir } from "@/components/ui/elegir"
import { Avatar } from "@/components/iconos-planer"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { errorFechaEntrega } from "@/lib/fecha-entrega"
import { iniciales } from "@/lib/planer-ui"
import type { SlaState } from "@/lib/domain"
import { SelectorArchivo } from "@/components/archivo"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CamposMovimiento } from "@/components/campos-movimiento"
import { detalleExigeDialogo, debePedirResponsable, VENTANA_DESHACER_MS, validarDatosMovimiento } from "@/lib/tablero-movimiento"
import { notaResolucionOpcional, visibilidadDefecto } from "@/lib/cronologia"

type Transicion = { name: string; to: string; label: string; requiresComment: boolean; requiresDelivery?: boolean; requiresAssignee?: boolean; requiresCommittedDate?: boolean }
type Agente = { id: string; name: string }

export function Gestion({
  code,
  transiciones,
  puedeAsignar,
  agentes,
  asignadoId,
  fechaComprometida,
  puedeComentar,
  puedeNota,
  puedeAdjuntar,
  notaPrefill = "",
  soloTransiciones = false,
  panel = false,
  estado = "",
  prioridad = "",
  sla = "NO_APLICA" as SlaState,
  responsable = "",
  fechaEntrega = "",
  hoy = "",
}: {
  code: string
  transiciones: Transicion[]
  puedeAsignar: boolean
  agentes: Agente[]
  asignadoId: string | null
  fechaComprometida: string | null
  puedeComentar: boolean
  puedeNota: boolean
  puedeAdjuntar: boolean
  notaPrefill?: string
  soloTransiciones?: boolean
  panel?: boolean
  estado?: string
  prioridad?: string
  sla?: SlaState
  responsable?: string
  fechaEntrega?: string
  hoy?: string
}) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [assigneeId, setAssigneeId] = useState(asignadoId ?? "")
  const [responsableVisible, setResponsableVisible] = useState(responsable)
  useEffect(() => setResponsableVisible(responsable), [responsable])
  const [interna, setInterna] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Transicion | null>(null)
  const [motivo, setMotivo] = useState("")
  const [entrega, setEntrega] = useState("")
  const [resolucion, setResolucion] = useState("RESUELTO")
  const [responsableId, setResponsableId] = useState(asignadoId ?? "")
  const [fecha, setFecha] = useState(fechaComprometida ?? "")
  const [entregaEsperada, setEntregaEsperada] = useState(fechaEntrega)
  const [errorFecha, setErrorFecha] = useState<string | null>(null)
  const [fechaTocada, setFechaTocada] = useState(false)
  const [pending, start] = useTransition()

  function correr(action: (data: FormData) => Promise<ActionResult>, data: FormData, deshacer = false) {
    setError(null)
    start(async () => {
      const result = await action(data)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setDialogo(null)
      if (deshacer) {
        toast.success(result.message || "Cambio guardado.", {
          duration: VENTANA_DESHACER_MS,
          action: {
            label: "Deshacer",
            onClick: () => {
              const vuelta = new FormData()
              vuelta.set("code", code)
              start(async () => {
                const hecho = await deshacerTransicionAction(vuelta)
                if (!hecho.ok) {
                  setError(hecho.error)
                  toast.error(hecho.error)
                  return
                }
                toast.success(hecho.message || "Se deshizo el cambio.")
                router.refresh()
              })
            },
          },
        })
      } else if (result.message) toast.success(result.message)
      setComment("")
      router.refresh()
    })
  }

  function transicionar(transicion: Transicion, note: string, deliveryUrl: string) {
    const validacion = validarDatosMovimiento({
      name: transicion.label,
      column: "",
      to: transicion.to,
      requiresComment: transicion.requiresComment,
      requiresDelivery: transicion.requiresDelivery,
      requiresAssignee: transicion.requiresAssignee,
      requiresCommittedDate: transicion.requiresCommittedDate,
    }, note, deliveryUrl, {
      assigneeId: asignadoId || responsableId,
      committedDate: fechaComprometida || fecha,
    })
    if (validacion) {
      setError(validacion)
      toast.error(validacion)
      return
    }
    const data = new FormData()
    data.set("code", code)
    data.set("name", transicion.name)
    data.set("comment", note)
    data.set("deliveryUrl", deliveryUrl)
    data.set("visibilidad", visibilidadDefecto(transicion.name))
    if (notaResolucionOpcional(transicion)) data.set("resolutionNote", note)
    if (transicion.to === "CERRADO") data.set("resolution", resolucion)
    if (responsableId) data.set("assigneeId", responsableId)
    if (fecha) data.set("committedDate", fecha)
    correr(transicionarAction, data, true)
  }

  function revisarFecha(valor: string) {
    const mensaje = errorFechaEntrega(valor, new Date(`${hoy || "2026-01-01"}T12:00:00`))
    setErrorFecha(mensaje)
    return mensaje
  }

  const ficha = panel ? (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-[#15122A]">Responsable</p>
        <div className="flex items-center gap-2">
          {responsableVisible ? <Avatar nombre={responsableVisible} /> : <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#F3F4F6] text-[10px] text-[#667085]">—</span>}
          {responsableVisible ? <span className="text-sm">{responsableVisible}</span> : <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-medium text-[#92400E]">Sin asignar</span>}
        </div>
        {puedeAsignar && agentes.length > 0 ? (
          <form className="grid gap-2" onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData()
            data.set("code", code)
            data.set("assigneeId", assigneeId)
            const nombre = agentes.find((agente) => agente.id === assigneeId)?.name ?? "la persona"
            start(async () => {
              const result = await asignarAction(data)
              if (!result.ok) {
                setError(result.error)
                toast.error(result.error)
                return
              }
              setResponsableVisible(nombre)
              toast.success(`Asignado a ${nombre}`, {
                description: <a className="font-medium text-[#1658B0] underline" href={`/personas?persona=${assigneeId}`}>Ver en sus tareas</a>,
              })
              router.refresh()
            })
          }}>
            <Elegir ariaLabel="Asignar a" value={assigneeId} onValueChange={setAssigneeId} placeholder="Asignar a…" opciones={agentes.map((agente) => ({ value: agente.id, label: agente.name, iniciales: iniciales(agente.name) }))} />
            <button type="submit" disabled={pending || !assigneeId} className="h-11 rounded-lg bg-[#1658B0] text-sm font-medium text-white disabled:opacity-50">Asignar</button>
          </form>
        ) : null}
      </div>
      <div className="grid gap-1">
        <p className="text-sm font-medium text-[#15122A]">Estado</p>
        {estado ? <EstadoBadge status={estado} /> : null}
      </div>
      <div className="grid gap-1">
        <p className="text-sm font-medium text-[#15122A]">Prioridad</p>
        <p className="text-sm">{prioridad || "—"}</p>
      </div>
      <form className="grid gap-2" onSubmit={(event) => {
        event.preventDefault()
        setFechaTocada(true)
        if (revisarFecha(entregaEsperada)) return
        const data = new FormData()
        data.set("code", code)
        data.set("desiredDate", entregaEsperada)
        correr(guardarFechaEntregaAction, data)
      }}>
        <label className="grid gap-1.5 text-sm font-medium text-[#15122A]" htmlFor="fecha-entrega-esperada">
          Fecha de entrega esperada
          <input id="fecha-entrega-esperada" type="date" lang="es-CO" min={hoy} value={entregaEsperada} onChange={(event) => { setEntregaEsperada(event.target.value); setFechaTocada(true); revisarFecha(event.target.value) }} onBlur={() => { setFechaTocada(true); revisarFecha(entregaEsperada) }} className="h-11 w-full rounded-[10px] border border-[#D9DEE7] bg-white px-3 text-sm font-normal" aria-invalid={Boolean(fechaTocada && errorFecha)} />
        </label>
        {fechaTocada && errorFecha ? <p className="text-xs text-red-700">{errorFecha}</p> : null}
        <button type="submit" disabled={pending || Boolean(errorFecha)} className="h-11 rounded-lg border border-[#1658B0] text-sm font-medium text-[#1658B0] disabled:opacity-50">Guardar fecha</button>
      </form>
      <div className="grid gap-1">
        <p className="text-sm font-medium text-[#15122A]">SLA</p>
        <SlaBadge state={sla} />
      </div>
    </div>
  ) : null

  return (
    <div className="grid gap-5" id="gestion">
      {ficha}
      {!panel && puedeAsignar && agentes.length > 0 ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData()
            data.set("code", code)
            data.set("assigneeId", assigneeId)
            correr(asignarAction, data)
          }}
        >
          <Label>Asignar</Label>
          <Select value={assigneeId || undefined} onValueChange={setAssigneeId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Elija un agente" /></SelectTrigger>
            <SelectContent>
              {agentes.map((agente) => (
                <SelectItem key={agente.id} value={agente.id}>{agente.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary" disabled={pending || !assigneeId}>Guardar asignación</Button>
        </form>
      ) : null}

      {transiciones.length > 0 ? (
        <div className="grid gap-2">
          <Label htmlFor="gestion">Comentario de la gestión</Label>
          <Textarea id="gestion" value={comment} onChange={(event) => setComment(event.target.value)} rows={4} placeholder="Obligatorio al devolver, pedir información, resolver o cancelar." />
          <div className="flex flex-col gap-2">
            {transiciones.map((transicion) => (
              <Button
                key={transicion.name}
                type="button"
                variant={transicion.to === "CANCELADO" || transicion.to === "DEVUELTO" ? "outline" : "default"}
                disabled={pending}
                onClick={() => {
                  if (detalleExigeDialogo(transicion, { assigneeId: asignadoId, committedDate: fechaComprometida })) {
                    setMotivo(notaResolucionOpcional(transicion) ? (notaPrefill || comment) : comment)
                    setEntrega("")
                    setResolucion("RESUELTO")
                    setResponsableId(asignadoId ?? "")
                    setFecha(fechaComprometida ?? "")
                    setDialogo(transicion)
                    setError(null)
                    return
                  }
                  transicionar(transicion, comment, "")
                }}
              >
                {transicion.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No hay acciones disponibles para su perfil en este estado.</p>
      )}

      {!soloTransiciones && puedeComentar ? (
        <form
          className="grid gap-2 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            data.set("code", code)
            data.set("interna", interna ? "1" : "0")
            correr(comentarAction, data)
            event.currentTarget.reset()
            setInterna(false)
          }}
        >
          <Label htmlFor="comentario">Responder en el requerimiento</Label>
          <Textarea id="comentario" name="body" required minLength={2} rows={3} placeholder="Escriba la respuesta para que quede en el historial." />
          {puedeNota ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={interna} onCheckedChange={(value) => setInterna(value === true)} />
              Nota interna, oculta para el solicitante
            </label>
          ) : null}
          <Button type="submit" variant="secondary" disabled={pending}>Publicar comentario</Button>
        </form>
      ) : null}

      {!soloTransiciones && puedeAdjuntar ? (
        <form
          className="grid gap-2 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            data.set("code", code)
            correr(adjuntarAction, data)
            event.currentTarget.reset()
          }}
        >
          <Label>Adjuntar archivo</Label>
          <SelectorArchivo name="archivo" required />
          <Button type="submit" variant="outline" disabled={pending}>Subir</Button>
        </form>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
      <Dialog open={Boolean(dialogo)} onOpenChange={(open) => { if (!open) setDialogo(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogo?.label}</DialogTitle>
          </DialogHeader>
          <CamposMovimiento
            prefijo="detalle"
            movimiento={dialogo ? { name: dialogo.name, column: "", to: dialogo.to, requiresComment: dialogo.requiresComment, requiresDelivery: dialogo.requiresDelivery, requiresAssignee: dialogo.requiresAssignee, requiresCommittedDate: dialogo.requiresCommittedDate } : null}
            pideResponsable={Boolean(dialogo && debePedirResponsable({ assigneeId: asignadoId }, dialogo))}
            pideFecha={Boolean(dialogo?.requiresCommittedDate && !fechaComprometida)}
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
            etiquetaMotivo={dialogo && notaResolucionOpcional(dialogo) ? "Qué se hizo" : "Motivo"}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button type="button" disabled={pending || !dialogo} onClick={() => { if (dialogo) transicionar(dialogo, motivo, entrega) }}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
