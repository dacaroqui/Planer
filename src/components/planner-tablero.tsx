"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { guardarTareaAction } from "@/server/actions"
import { Barra } from "@/components/barra"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const COLUMNAS = [
  { key: "PENDIENTE", label: "Pendiente" },
  { key: "EN_CURSO", label: "En curso" },
  { key: "HECHA", label: "Hecha" },
] as const

export type SubtareaVista = {
  id: string
  title: string
  status: "PENDIENTE" | "EN_CURSO" | "HECHA"
  assignee: string
  dueDate: string | null
}

export type TareaPlanner = {
  id: string
  title: string
  status: "PENDIENTE" | "EN_CURSO" | "HECHA"
  assignee: string
  assigneeId: string
  dueDate: string | null
  vencida: boolean
  porcentaje: number
  proyecto: string
  projectId: string
  requestCode: string | null
  subtareas: SubtareaVista[]
}

export function PlannerTablero({
  grupos,
  puede,
  agentes,
}: {
  grupos: { id: string; nombre: string; tareas: TareaPlanner[] }[]
  puede: boolean
  agentes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [vista, setVista] = useState(grupos)
  useEffect(() => setVista(grupos), [grupos])
  const [pending, start] = useTransition()

  function guardar(data: FormData) {
    start(async () => {
      const result = await guardarTareaAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || "Planner actualizado.")
      router.refresh()
    })
  }

  function soltar(event: React.DragEvent<HTMLElement>, status: string, projectId: string) {
    event.preventDefault()
    if (!puede) return
    const id = event.dataTransfer.getData("text/plain")
    const tarea = vista.flatMap((grupo) => grupo.tareas).find((item) => item.id === id)
    if (!tarea || tarea.projectId !== projectId) {
      toast.error("Mueva la tarea dentro de su proyecto.")
      return
    }
    const data = new FormData()
    data.set("id", id)
    data.set("title", tarea.title)
    data.set("status", status)
    if (projectId !== "sin-proyecto") data.set("projectId", projectId)
    setVista((actual) => actual.map((grupo) => ({
      ...grupo,
      tareas: grupo.tareas.map((item) => item.id === id ? { ...item, status: status as TareaPlanner["status"], porcentaje: status === "HECHA" && item.subtareas.length === 0 ? 100 : item.porcentaje } : item),
    })))
    guardar(data)
  }

  return (
    <div className="space-y-8">
      {vista.map((grupo) => (
        <section key={grupo.id}>
          <h2 className="font-heading text-2xl">{grupo.nombre}</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {COLUMNAS.map((columna) => (
              <div
                key={columna.key}
                className="min-h-40 rounded-xl bg-muted/70 p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => soltar(event, columna.key, grupo.id)}
              >
                <p className="px-1 py-2 text-sm font-medium">{columna.label}</p>
                <div className="grid gap-2">
                  {grupo.tareas.filter((tarea) => tarea.status === columna.key).map((tarea) => (
                    <article
                      key={tarea.id}
                      draggable={puede && !pending}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", tarea.id)}
                      className="rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <button type="button" className="text-left font-medium" onClick={() => setAbierta(abierta === tarea.id ? null : tarea.id)}>
                        {tarea.title}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tarea.assignee}{tarea.requestCode ? ` · ${tarea.requestCode}` : ""}{tarea.vencida ? " · vencida" : ""}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Barra porcentaje={tarea.porcentaje} />
                        <span className="text-xs">{tarea.porcentaje}%</span>
                      </div>
                      {abierta === tarea.id ? (
                        <div className="mt-3 grid gap-2 border-t border-border pt-2">
                          <p className="text-xs font-medium">Subtareas</p>
                          {tarea.subtareas.length === 0 ? <p className="text-xs text-muted-foreground">Sin lista de verificación.</p> : tarea.subtareas.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className={sub.status === "HECHA" ? "line-through" : ""}>{sub.title}</span>
                              <span className="text-muted-foreground">{sub.assignee}{sub.dueDate ? ` · ${sub.dueDate}` : ""}</span>
                              {puede && sub.status !== "HECHA" ? (
                                <form action={(data) => guardar(data)}>
                                  <input type="hidden" name="id" value={sub.id} />
                                  <input type="hidden" name="title" value={sub.title} />
                                  <input type="hidden" name="status" value="HECHA" />
                                  <input type="hidden" name="parentId" value={tarea.id} />
                                  {tarea.projectId !== "sin-proyecto" ? <input type="hidden" name="projectId" value={tarea.projectId} /> : null}
                                  <Button type="submit" size="sm" variant="outline" disabled={pending} aria-label={`Marcar subtarea como hecha: ${sub.title}`}>Marcar subtarea como hecha</Button>
                                </form>
                              ) : <span>{sub.status === "HECHA" ? "Hecha" : sub.status === "EN_CURSO" ? "En curso" : "Pendiente"}</span>}
                            </div>
                          ))}
                          {puede ? (
                            <form className="grid gap-2" onSubmit={(event) => {
                              event.preventDefault()
                              const data = new FormData(event.currentTarget)
                              data.set("status", "PENDIENTE")
                              data.set("parentId", tarea.id)
                              if (tarea.projectId !== "sin-proyecto") data.set("projectId", tarea.projectId)
                              guardar(data)
                              event.currentTarget.reset()
                            }}>
                              <Input name="title" placeholder="Nueva subtarea" required minLength={3} />
                              <div className="grid grid-cols-2 gap-2">
                                <select name="assigneeId" className="h-8 rounded-lg border border-input px-2 text-xs" aria-label="Responsable de la subtarea" defaultValue="">
                                  <option value="">Sin responsable</option>
                                  {agentes.map((agente) => <option key={agente.id} value={agente.id}>{agente.name}</option>)}
                                </select>
                                <Input name="dueDate" type="date" lang="es-CO" aria-label="Fecha de la subtarea" />
                              </div>
                              <Button type="submit" size="sm" disabled={pending}>Agregar subtarea</Button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
