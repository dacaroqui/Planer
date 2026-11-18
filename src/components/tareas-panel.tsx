"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { EliminarTarea } from "@/components/confirmar-eliminar"
import { guardarTareaAction } from "@/server/actions"
import { Barra } from "@/components/barra"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type TareaVista = {
  id: string
  title: string
  status: "PENDIENTE" | "EN_CURSO" | "HECHA"
  dueDate: string | null
  assignee: string
  vencida: boolean
  horasEstimadas?: number | null
  horasReales?: number | null
}

const ETIQUETA = { PENDIENTE: "Pendiente", EN_CURSO: "En curso", HECHA: "Hecha" }

export function TareasPanel({
  tareas,
  porcentaje,
  puede,
  puedeEliminar = false,
  requestId,
  projectId,
  parentId,
  agentes,
}: {
  tareas: TareaVista[]
  porcentaje: number
  puede: boolean
  puedeEliminar?: boolean
  requestId?: string
  projectId?: string
  parentId?: string
  agentes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<"PENDIENTE" | "EN_CURSO" | "HECHA">("PENDIENTE")
  const [assigneeId, setAssigneeId] = useState("")

  function enviar(data: FormData) {
    start(async () => {
      const result = await guardarTareaAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || "Tarea actualizada.")
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{porcentaje}% de avance</span>
        <span className="text-muted-foreground">{tareas.filter((tarea) => tarea.status === "HECHA").length}/{tareas.length || 0} hechas</span>
      </div>
      <Barra porcentaje={porcentaje} />
      {tareas.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay tareas.</p> : tareas.map((tarea) => (
        <div key={tarea.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <div>
            <p className={tarea.status === "HECHA" ? "line-through" : ""}>{tarea.title}</p>
            <p className="text-xs text-muted-foreground">
              {tarea.assignee} · {ETIQUETA[tarea.status]}
              {tarea.dueDate ? ` · vence ${tarea.dueDate}` : ""}
              {tarea.vencida ? " · vencida" : ""}
              {` · est. ${tarea.horasEstimadas ?? "—"} h · real ${tarea.horasReales ?? 0} h`}
            </p>
            {puede ? (
              <form className="mt-1 flex items-center gap-2" action={(data) => enviar(data)}>
                <input type="hidden" name="id" value={tarea.id} />
                <input type="hidden" name="title" value={tarea.title} />
                <input type="hidden" name="status" value={tarea.status} />
                {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
                {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
                <input name="horasEstimadas" type="number" min="0" step="0.5" defaultValue={tarea.horasEstimadas ?? ""} aria-label={`Horas estimadas de ${tarea.title}`} className="h-8 w-20 rounded-lg border border-[#E4E7EC] px-2 text-xs" placeholder="Est." />
                <Button type="submit" size="sm" variant="outline" disabled={pending}>Guardar estimación</Button>
              </form>
            ) : null}
          </div>
          <span className="flex flex-wrap items-center gap-2">
          {puede && tarea.status !== "HECHA" ? (
            <form action={(data) => enviar(data)}>
              <input type="hidden" name="id" value={tarea.id} />
              <input type="hidden" name="title" value={tarea.title} />
              <input type="hidden" name="status" value="HECHA" />
              {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
              {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
              <Button type="submit" size="sm" disabled={pending}>Marcar hecha</Button>
            </form>
          ) : null}
          {puedeEliminar ? <EliminarTarea id={tarea.id} title={tarea.title} menu /> : null}
          </span>
        </div>
      ))}
      {puede ? (
        <form className="grid gap-2 border-t border-border pt-3" onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          data.set("status", status)
          data.set("assigneeId", assigneeId)
          if (requestId) data.set("requestId", requestId)
          if (projectId) data.set("projectId", projectId)
          if (parentId) data.set("parentId", parentId)
          enviar(data)
          event.currentTarget.reset()
        }}>
          <Input name="title" placeholder={parentId ? "Subtarea" : "Nueva tarea"} required minLength={3} />
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-full" aria-label="Estado"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_CURSO">En curso</SelectItem>
                <SelectItem value="HECHA">Hecha</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeId || "NADIE"} onValueChange={(value) => setAssigneeId(value === "NADIE" ? "" : value)}>
              <SelectTrigger className="w-full" aria-label="Responsable"><SelectValue placeholder="Sin responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NADIE">Sin responsable</SelectItem>
                {agentes.map((agente) => <SelectItem key={agente.id} value={agente.id}>{agente.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input name="dueDate" type="date" lang="es-CO" aria-label="Fecha límite" />
          </div>
          <Button type="submit" size="sm" disabled={pending}>Agregar tarea</Button>
        </form>
      ) : null}
    </div>
  )
}
