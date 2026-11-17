"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { adjuntarAction, asignarAction, comentarAction, transicionarAction, type ActionResult } from "@/server/actions"
import { SelectorArchivo } from "@/components/archivo"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { movimientoCierra, validarDatosMovimiento } from "@/lib/tablero-movimiento"

type Transicion = { to: string; label: string; requiresComment: boolean; requiresDelivery?: boolean }
type Agente = { id: string; name: string }

export function Gestion({
  code,
  transiciones,
  puedeAsignar,
  agentes,
  asignadoId,
  puedeComentar,
  puedeNota,
  puedeAdjuntar,
}: {
  code: string
  transiciones: Transicion[]
  puedeAsignar: boolean
  agentes: Agente[]
  asignadoId: string | null
  puedeComentar: boolean
  puedeNota: boolean
  puedeAdjuntar: boolean
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
  const [pending, start] = useTransition()

  function correr(action: (data: FormData) => Promise<ActionResult>, data: FormData) {
    setError(null)
    start(async () => {
      const result = await action(data)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setDialogo(null)
      if (result.message) toast.success(result.message)
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
    }, note, deliveryUrl)
    if (validacion) {
      setError(validacion)
      toast.error(validacion)
      return
    }
    const data = new FormData()
    data.set("code", code)
    data.set("name", transicion.to)
    data.set("comment", note)
    data.set("deliveryUrl", deliveryUrl)
    if (movimientoCierra(transicion)) data.set("resolution", resolucion)
    correr(transicionarAction, data)
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
                key={transicion.to}
                type="button"
                variant={transicion.to === "CANCELADO" || transicion.to === "DEVUELTO" ? "outline" : "default"}
                disabled={pending}
                onClick={() => {
                  if (transicion.requiresComment || transicion.requiresDelivery || movimientoCierra(transicion)) {
                    setMotivo(comment)
                    setEntrega("")
                    setResolucion("RESUELTO")
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

      {puedeComentar ? (
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

      {puedeAdjuntar ? (
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
          {dialogo && movimientoCierra(dialogo) ? (
            <div className="grid gap-1">
              <Label htmlFor="resolucion-gestion">Resolución</Label>
              <select id="resolucion-gestion" className="h-9 rounded-lg border border-input px-2 text-sm" value={resolucion} onChange={(event) => setResolucion(event.target.value)} aria-label="Resolución">
                <option value="RESUELTO">Resuelto</option>
                <option value="NO_SE_HARA">No se hará</option>
                <option value="DUPLICADO">Duplicado</option>
                <option value="CANCELADO_SOLICITANTE">Cancelado por el solicitante</option>
              </select>
            </div>
          ) : null}
          {dialogo && (dialogo.requiresComment || movimientoCierra(dialogo)) ? (
            <div className="grid gap-1">
              <Label htmlFor="motivo-gestion">Motivo</Label>
              <Textarea id="motivo-gestion" value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={3} placeholder="Queda en el historial." />
            </div>
          ) : null}
          {dialogo?.requiresDelivery ? (
            <div className="grid gap-1">
              <Label htmlFor="entrega-gestion">Enlace de la entrega</Label>
              <Input id="entrega-gestion" value={entrega} onChange={(event) => setEntrega(event.target.value)} placeholder="https://" />
              <p className="text-xs text-muted-foreground">Si ya adjuntó el archivo, puede dejar el enlace vacío.</p>
            </div>
          ) : null}
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
