"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { adjuntarAction, asignarAction, comentarAction, transicionarAction, type ActionResult } from "@/server/actions"
import { SelectorArchivo } from "@/components/archivo"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Transicion = { to: string; label: string; requiresComment: boolean }
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
  const [pending, start] = useTransition()

  function correr(action: (data: FormData) => Promise<ActionResult>, data: FormData) {
    setError(null)
    start(async () => {
      const result = await action(data)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.message) toast.success(result.message)
      setComment("")
      router.refresh()
    })
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
                  if (transicion.requiresComment && comment.trim().length < 2) {
                    setError("Escriba un comentario para esta acción.")
                    return
                  }
                  const data = new FormData()
                  data.set("code", code)
                  data.set("to", transicion.to)
                  data.set("comment", comment)
                  correr(transicionarAction, data)
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
    </div>
  )
}
