"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { EliminarTarea } from "@/components/confirmar-eliminar"
import { guardarTareaAction } from "@/server/actions"
import { Avatar } from "@/components/iconos-planer"
import { Barra } from "@/components/barra"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  puedeEliminar = false,
  agentes,
}: {
  grupos: { id: string; nombre: string; tareas: TareaPlanner[] }[]
  puede: boolean
  puedeEliminar?: boolean
  agentes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [vista, setVista] = useState(grupos)
  const [confirma, setConfirma] = useState<{ id: string; status: TareaPlanner["status"]; projectId: string; title: string; columna: string } | null>(null)
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

  function soltar(event: React.DragEvent<HTMLElement>, status: TareaPlanner["status"], projectId: string, columna: string) {
    event.preventDefault()
    if (!puede || pending) return
    const id = event.dataTransfer.getData("text/plain")
    const tarea = vista.flatMap((grupo) => grupo.tareas).find((item) => item.id === id)
    if (!tarea || tarea.projectId !== projectId) {
      toast.error("Mueva la tarea dentro de su proyecto.")
      return
    }
    if (tarea.status === status) return
    setConfirma({ id, status, projectId, title: tarea.title, columna })
  }

  function aplicarMovimiento() {
    if (!confirma) return
    const { id, status, projectId, title } = confirma
    const data = new FormData()
    data.set("id", id)
    data.set("title", title)
    data.set("status", status)
    if (projectId !== "sin-proyecto") data.set("projectId", projectId)
    setVista((actual) => actual.map((grupo) => ({
      ...grupo,
      tareas: grupo.tareas.map((item) => item.id === id ? { ...item, status, porcentaje: status === "HECHA" && item.subtareas.length === 0 ? 100 : item.porcentaje } : item),
    })))
    setConfirma(null)
    guardar(data)
  }

  return (
    <div className="space-y-5">
      {vista.map((grupo) => {
        const promedio = grupo.tareas.length === 0 ? 0 : Math.round(grupo.tareas.reduce((suma, tarea) => suma + tarea.porcentaje, 0) / grupo.tareas.length)
        return (
        <section key={grupo.id} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <header className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">{grupo.nombre}</h2>
              <p className="text-xs text-muted-foreground">{grupo.tareas.length.toLocaleString("es-CO")} tareas</p>
            </div>
            <span className="text-sm font-medium tabular-nums text-[#1658B0]">{promedio}%</span>
          </header>
          <div className="grid gap-3 lg:grid-cols-3">
            {COLUMNAS.map((columna) => {
              const propias = grupo.tareas.filter((tarea) => tarea.status === columna.key)
              return (
              <div
                key={columna.key}
                className="min-h-40 rounded-lg bg-[#F4F7FC] p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => soltar(event, columna.key, grupo.id, columna.label)}
              >
                <p className="flex items-center justify-between px-1 py-2 text-sm font-medium">
                  {columna.label}
                  <span className="text-xs font-normal text-muted-foreground">{propias.length}</span>
                </p>
                <div className="grid gap-2">
                  {propias.map((tarea) => (
                    <article
                      key={tarea.id}
                      draggable={puede && !pending}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", tarea.id)}
                      className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="text-left font-medium" onClick={() => setAbierta(abierta === tarea.id ? null : tarea.id)}>
                          {tarea.title}
                        </button>
                        {puedeEliminar ? <EliminarTarea id={tarea.id} title={tarea.title} menu /> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {tarea.requestCode ? <Link href={`/requerimientos/${tarea.requestCode}`} className="rounded-md bg-[#E7F0FB] px-1.5 py-0.5 text-[11px] font-medium text-[#1658B0]">{tarea.requestCode}</Link> : null}
                        {tarea.vencida ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">vencida</span> : null}
                      </div>
                      <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar nombre={tarea.assignee} /> {tarea.assignee}
                      </p>
                      <div className="mt-2">
                        <Barra porcentaje={tarea.porcentaje} />
                      </div>
                      {abierta === tarea.id ? (
                        <div className="mt-3 grid gap-2 border-t border-border pt-2">
                          <p className="text-xs font-medium">Subtareas</p>
                          {tarea.subtareas.length === 0 ? <p className="text-xs text-muted-foreground">Sin lista de verificación.</p> : tarea.subtareas.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className={sub.status === "HECHA" ? "line-through" : ""}>{sub.title}</span>
                              <span className="text-muted-foreground">{sub.assignee}{sub.dueDate ? ` · ${sub.dueDate}` : ""}</span>
                              {puedeEliminar ? <EliminarTarea id={sub.id} title={sub.title} /> : null}
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
              )
            })}
          </div>
        </section>
        )
      })}
      <Dialog open={Boolean(confirma)} onOpenChange={(abierto) => { if (!abierto && !pending) setConfirma(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover la tarea</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirma ? `«${confirma.title}» pasará a ${confirma.columna}. Si cancela, la tarjeta se queda donde está.` : null}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirma(null)} disabled={pending}>Cancelar</Button>
            <Button type="button" onClick={aplicarMovimiento} disabled={pending || !confirma}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
