"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { adjuntarAction, asignarAction, comentarAction, deshacerTransicionAction, transicionarAction, type ActionResult } from "@/server/actions"
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
}) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [assigneeId, setAssigneeId] = useState(asignadoId ?? "")
  const [interna, setInterna] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Transicion | null>(null)
  const [motivo, setMotivo] = useState("")
  const [entrega, setEntrega] = useState("")
  const [resolucion, setResolucion] = useState("RESUELTO")
  const [responsableId, setResponsableId] = useState(asignadoId ?? "")
  const [fecha, setFecha] = useState(fechaComprometida ?? "")
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

  return (
    <div className="grid gap-5">
      {puedeAsignar && agentes.length > 0 ? (
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
