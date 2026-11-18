"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { EliminarTarea } from "@/components/confirmar-eliminar"
import { Avatar } from "@/components/iconos-planer"
import { guardarTareaAction } from "@/server/actions"
import { Barra } from "@/components/barra"
import { Elegir } from "@/components/ui/elegir"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { iniciales } from "@/lib/planer-ui"

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
  const [agregar, setAgregar] = useState(false)

  function enviar(data: FormData) {
    const responsable = String(data.get("assigneeId") || "")
    const nombre = agentes.find((agente) => agente.id === responsable)?.name
    start(async () => {
      const result = await guardarTareaAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (nombre && responsable) {
        toast.success(`Asignado a ${nombre}`, {
          description: <a className="font-medium text-[#1658B0] underline" href={`/personas?persona=${responsable}`}>Ver en sus tareas</a>,
        })
      } else toast.success(result.message || "Tarea actualizada.")
      setAgregar(false)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Avance {porcentaje}%</span>
        <span className="text-muted-foreground">{tareas.filter((tarea) => tarea.status === "HECHA").length}/{tareas.length || 0} hechas</span>
      </div>
      <Barra porcentaje={porcentaje} />
      {tareas.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay tareas en esta solicitud.</p> : tareas.map((tarea) => (
        <div key={tarea.id} className="grid gap-2 rounded-lg border border-[#E4E7EC] px-3 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={tarea.status === "HECHA" ? "font-medium line-through" : "font-medium"}>{tarea.title}</p>
            <span className={tarea.status === "HECHA" ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" : tarea.status === "EN_CURSO" ? "rounded-full bg-[#E7F0FB] px-2 py-0.5 text-xs font-medium text-[#1658B0]" : "rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#3d4a63]"}>{ETIQUETA[tarea.status]}</span>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Avatar nombre={tarea.assignee === "Sin responsable" ? "?" : tarea.assignee} />
            <span>{tarea.assignee}</span>
            <span>{tarea.dueDate ? `Fecha ${tarea.dueDate}` : "Sin fecha"}</span>
            {tarea.vencida ? <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">Vencida</span> : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      ))}
      {puede && !agregar ? (
        <button type="button" className="h-11 rounded-lg border border-dashed border-[#1658B0] text-sm font-medium text-[#1658B0]" onClick={() => setAgregar(true)}>+ Agregar tarea</button>
      ) : null}
      {puede && agregar ? (
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
            <Elegir ariaLabel="Estado" value={status} onValueChange={(valor) => setStatus(valor as typeof status)} opciones={[{ value: "PENDIENTE", label: "Pendiente" }, { value: "EN_CURSO", label: "En curso" }, { value: "HECHA", label: "Hecha" }]} />
            <Elegir ariaLabel="Responsable" value={assigneeId} onValueChange={setAssigneeId} placeholder="Sin responsable" opciones={[{ value: "", label: "Sin responsable" }, ...agentes.map((agente) => ({ value: agente.id, label: agente.name, iniciales: iniciales(agente.name) }))]} />
            <Input name="dueDate" type="date" lang="es-CO" aria-label="Fecha límite" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>Agregar tarea</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAgregar(false)}>Cancelar</Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
