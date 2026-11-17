"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { asignarMasivaAction, eliminarRequerimientosAction, estadoMasivaAction, prioridadMasivaAction } from "@/server/actions"
import { textoEliminar } from "@/lib/eliminar"
import type { PriorityName } from "@/lib/domain"
import { STATUS_LABEL } from "@/lib/domain"

const PRIORIDADES: { value: PriorityName; label: string }[] = [
  { value: "CRITICA", label: "Crítica" },
  { value: "ALTA", label: "Alta" },
  { value: "MEDIA", label: "Media" },
  { value: "BAJA", label: "Baja" },
]

export type AccionesMasivasProps = {
  codes: string[]
  puedePrioridad?: boolean
  puedeEstado?: boolean
  puedeAsignar?: boolean
  puedeEliminar?: boolean
  seleccion?: { code: string; title: string }[]
  estados?: { value: string; label: string }[]
  agentes?: { id: string; name: string }[]
  onLimpiar: () => void
}

export function AccionesMasivas({
  codes,
  puedePrioridad = false,
  puedeEstado = false,
  puedeAsignar = false,
  puedeEliminar = false,
  seleccion = [],
  estados,
  agentes = [],
  onLimpiar,
}: AccionesMasivasProps) {
  const router = useRouter()
  const [priority, setPriority] = useState<PriorityName>("MEDIA")
  const [status, setStatus] = useState(estados?.[0]?.value ?? "NUEVO")
  const [assigneeId, setAssigneeId] = useState(agentes[0]?.id ?? "")
  const [pending, start] = useTransition()
  const [confirmar, setConfirmar] = useState(false)
  const opcionesEstado = estados && estados.length > 0
    ? estados
    : Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))

  function aplicar(action: (form: FormData) => Promise<{ ok: boolean; message?: string; error?: string }>, extras: Record<string, string>) {
    const form = new FormData()
    form.set("codes", codes.join(","))
    for (const [key, value] of Object.entries(extras)) form.set(key, value)
    start(async () => {
      const result = await action(form)
      if (result.ok) {
        toast.success(result.message)
        onLimpiar()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  if (codes.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Acciones sobre la selección"
      className="sticky bottom-3 z-20 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-md"
    >
      <p className="mr-1 text-sm font-medium">{codes.length} seleccionados</p>
      {puedePrioridad ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="masiva-prioridad">Prioridad</label>
          <select
            id="masiva-prioridad"
            className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value as PriorityName)}
            disabled={pending}
          >
            {PRIORIDADES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={pending} onClick={() => aplicar(prioridadMasivaAction, { priority })}>
            Cambiar prioridad
          </Button>
        </div>
      ) : null}
      {puedeEstado ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="masiva-estado">Estado</label>
          <select
            id="masiva-estado"
            className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={pending}
          >
            {opcionesEstado.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={pending} onClick={() => aplicar(estadoMasivaAction, { status })}>
            Cambiar estado
          </Button>
        </div>
      ) : null}
      {puedeAsignar ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="masiva-responsable">Responsable</label>
          <select
            id="masiva-responsable"
            className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={pending || agentes.length === 0}
          >
            {agentes.length === 0 ? <option value="">Sin responsables</option> : null}
            {agentes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={pending || !assigneeId} onClick={() => aplicar(asignarMasivaAction, { assigneeId })}>
            Asignar responsable
          </Button>
        </div>
      ) : null}
      {puedeEliminar ? (
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setConfirmar(true)}>
          Eliminar
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onLimpiar}>
        Limpiar
      </Button>
      <Dialog open={confirmar} onOpenChange={(abierto) => { if (!abierto && !pending) setConfirmar(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            {seleccion.filter((item) => codes.includes(item.code)).map((item) => (
              <p key={item.code}>{textoEliminar(item)}</p>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={() => {
              aplicar(eliminarRequerimientosAction, {})
              setConfirmar(false)
            }}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
