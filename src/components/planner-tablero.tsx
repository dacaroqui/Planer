"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckIcon, InfoIcon, Link2Icon, ListIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { FiltrosPlanner } from "@/components/planner-filtros"
import { Avatar } from "@/components/iconos-planer"
import { eliminarTareaAction, guardarTareaAction } from "@/server/actions"
import { textoEliminar } from "@/lib/eliminar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

const COLUMNAS = [
  { key: "PENDIENTE", label: "Pendiente", punto: "bg-[#9CA3AF]" },
  { key: "EN_CURSO", label: "En curso", punto: "bg-[#1658B0]" },
  { key: "HECHA", label: "Hecha", punto: "bg-[#16A34A]" },
] as const

type Estado = (typeof COLUMNAS)[number]["key"]

export type SubtareaVista = {
  id: string
  title: string
  status: Estado
  assignee: string
  dueDate: string | null
}

export type TareaPlanner = {
  id: string
  title: string
  status: Estado
  assignee: string
  assigneeId: string
  dueDate: string | null
  vencida: boolean
  porcentaje: number
  hechas: number
  total: number
  projectId: string
  requestCode: string | null
  subtareas: SubtareaVista[]
}

export function PlannerVista({
  empresas,
  proyectos,
  responsables,
  empresaId,
  proyectoId,
  tareas,
  puede,
  puedeEliminar,
}: {
  empresas: { id: string; name: string }[]
  proyectos: { id: string; name: string; empresaId: string }[]
  responsables: { id: string; name: string }[]
  empresaId: string
  proyectoId: string
  tareas: TareaPlanner[]
  puede: boolean
  puedeEliminar: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [buscar, setBuscar] = useState("")
  const [responsable, setResponsable] = useState("")
  const [estado, setEstado] = useState("")
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [vista, setVista] = useState(tareas)
  const [firma, setFirma] = useState(tareas)
  const [crear, setCrear] = useState<Estado | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirma, setConfirma] = useState<{ id: string; status: Estado; title: string } | null>(null)
  const [borrar, setBorrar] = useState<TareaPlanner | null>(null)
  if (firma !== tareas) {
    setFirma(tareas)
    setVista(tareas)
  }
  const editando = vista.find((item) => item.id === editId) ?? null
  const texto = buscar.trim().toLowerCase()
  const visibles = vista.filter((tarea) => {
    if (texto && !tarea.title.toLowerCase().includes(texto)) return false
    if (responsable && tarea.assigneeId !== responsable) return false
    if (estado && tarea.status !== estado) return false
    if (soloVencidas && !tarea.vencida) return false
    return true
  })
  const vencidas = vista.filter((tarea) => tarea.vencida).length
  const resumen = `${vista.length} ${vista.length === 1 ? "tarea" : "tareas"} · ${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`

  function ir(empresa: string, proyecto: string) {
    const next = new URLSearchParams()
    if (empresa) next.set("empresa", empresa)
    if (proyecto) next.set("proyecto", proyecto)
    const query = next.toString()
    router.push(query ? `/planner?${query}` : "/planner")
  }

  function guardar(data: FormData, alCerrar?: () => void) {
    start(async () => {
      const result = await guardarTareaAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || "Planner actualizado.")
      alCerrar?.()
      router.refresh()
    })
  }

  function soltar(event: React.DragEvent<HTMLElement>, status: Estado) {
    event.preventDefault()
    if (!puede || pending || !proyectoId) return
    const id = event.dataTransfer.getData("text/plain")
    const tarea = vista.find((item) => item.id === id)
    if (!tarea || tarea.status === status) return
    setConfirma({ id, status, title: tarea.title })
  }

  function aplicarMovimiento() {
    if (!confirma) return
    const tarea = vista.find((item) => item.id === confirma.id)
    if (!tarea) return
    const data = new FormData()
    data.set("id", tarea.id)
    data.set("title", tarea.title)
    data.set("status", confirma.status)
    if (tarea.assigneeId) data.set("assigneeId", tarea.assigneeId)
    if (tarea.dueDate) data.set("dueDate", tarea.dueDate)
    if (proyectoId) data.set("projectId", proyectoId)
    setVista((actual) => actual.map((item) => item.id === tarea.id ? {
      ...item,
      status: confirma.status,
      vencida: confirma.status === "HECHA" ? false : item.vencida,
      porcentaje: confirma.status === "HECHA" && item.total === 0 ? 100 : item.porcentaje,
    } : item))
    setConfirma(null)
    guardar(data)
  }

  function eliminar() {
    if (!borrar) return
    const data = new FormData()
    data.set("id", borrar.id)
    const id = borrar.id
    start(async () => {
      const result = await eliminarTareaAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || "Tarea eliminada.")
      setVista((actual) => actual.filter((item) => item.id !== id))
      setBorrar(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <FiltrosPlanner
        empresas={empresas}
        proyectos={proyectos}
        responsables={responsables}
        empresaId={empresaId}
        proyectoId={proyectoId}
        buscar={buscar}
        responsable={responsable}
        estado={estado}
        soloVencidas={soloVencidas}
        filtrosAbiertos={filtrosAbiertos}
        resumen={resumen}
        puedeCrear={puede && Boolean(proyectoId)}
        onNueva={() => setCrear("PENDIENTE")}
        onEmpresa={(id) => {
          const primero = proyectos.find((item) => item.empresaId === id)
          ir(id, primero?.id ?? "")
        }}
        onProyecto={(id) => ir(empresaId, id)}
        onBuscar={setBuscar}
        onResponsable={setResponsable}
        onEstado={setEstado}
        onVencidas={setSoloVencidas}
        onFiltros={() => setFiltrosAbiertos((valor) => !valor)}
      />
      {!proyectoId ? (
        <p className="text-sm text-muted-foreground">Este espacio no tiene proyectos en el catálogo.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {COLUMNAS.map((columna) => {
            const propias = visibles.filter((tarea) => tarea.status === columna.key)
            return (
              <section
                key={columna.key}
                className="flex min-h-80 flex-col rounded-xl border border-[#E4E7EC] bg-[#F1F3F6] p-4 shadow-[0_1px_2px_rgba(21,18,42,0.04)]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => soltar(event, columna.key)}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-base font-semibold">
                    <span className={`size-2 rounded-full ${columna.punto}`} aria-hidden />
                    {columna.label}
                    <span className="rounded-full bg-white px-1.5 text-xs font-normal text-muted-foreground">{propias.length}</span>
                  </span>
                  {puede ? (
                    <button type="button" aria-label={`Añadir tarea en ${columna.label}`} className="inline-flex size-7 items-center justify-center rounded-md text-[#1658B0] hover:bg-white" onClick={() => setCrear(columna.key)}>
                      <PlusIcon className="size-4" />
                    </button>
                  ) : null}
                </header>
                <div className="grid flex-1 content-start gap-2">
                  {propias.map((tarea) => (
                    <article
                      key={tarea.id}
                      draggable={puede && !pending}
                      onDragStart={(event) => {
                        if ((event.target as HTMLElement).closest("button, a, input, select")) {
                          event.preventDefault()
                          return
                        }
                        event.dataTransfer.setData("text/plain", tarea.id)
                      }}
                      className="rounded-xl border border-[#E4E7EC] bg-white p-4 text-[15px] shadow-[0_1px_2px_rgba(21,18,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-semibold">{tarea.title}</p>
                        {puede || puedeEliminar ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-md hover:bg-[#F3F4F6]" aria-label={`Acciones de ${tarea.title}`}>⋯</DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {puede ? <DropdownMenuItem onSelect={() => setEditId(tarea.id)}>Editar</DropdownMenuItem> : null}
                              {puede ? <DropdownMenuItem onSelect={() => setConfirma({ id: tarea.id, status: tarea.status === "HECHA" ? "EN_CURSO" : "HECHA", title: tarea.title })}>Mover</DropdownMenuItem> : null}
                              {puedeEliminar ? <DropdownMenuItem onSelect={() => setBorrar(tarea)}>Eliminar</DropdownMenuItem> : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {tarea.requestCode ? (
                          <Link href={`/requerimientos/${tarea.requestCode}`} className="inline-flex items-center gap-1 text-xs font-medium text-[#1658B0] hover:underline">
                            <Link2Icon className="size-3" /> {tarea.requestCode}
                          </Link>
                        ) : null}
                        {tarea.vencida ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Vencida</span> : null}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-8 tabular-nums">{tarea.porcentaje}%</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]" aria-label={`Avance ${tarea.porcentaje}%`}>
                          <span className={tarea.porcentaje >= 100 ? "block h-full rounded-full bg-[#16A34A]" : "block h-full rounded-full bg-[#1658B0]"} style={{ width: `${Math.max(0, Math.min(100, tarea.porcentaje))}%` }} />
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums"><ListIcon className="size-3" /> {tarea.hechas}/{tarea.total}</span>
                      </div>
                      <p className="mt-3 inline-flex items-center gap-2 text-xs">
                        <Avatar nombre={tarea.assignee} />
                        <span>{tarea.assignee}</span>
                        {tarea.status === "HECHA" ? <CheckIcon className="size-3.5 text-[#16A34A]" aria-label="Hecha" /> : null}
                      </p>
                    </article>
                  ))}
                </div>
                {puede ? (
                  <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1658B0] hover:underline" onClick={() => setCrear(columna.key)}>
                    <PlusIcon className="size-3.5" /> Añadir tarea
                  </button>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <InfoIcon className="size-3.5" /> El avance de cada tarea se calcula con sus subtareas.
      </p>
      <Dialog open={crear !== null} onOpenChange={(abierto) => { if (!abierto && !pending) setCrear(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            data.set("status", crear || "PENDIENTE")
            if (proyectoId) data.set("projectId", proyectoId)
            guardar(data, () => setCrear(null))
          }}>
            <Input name="title" placeholder="Título de la tarea" required minLength={3} aria-label="Título" />
            <select name="assigneeId" aria-label="Responsable de la tarea" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm" defaultValue="">
              <option value="">Sin responsable</option>
              {responsables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Input name="dueDate" type="date" lang="es-CO" aria-label="Fecha límite" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCrear(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Crear tarea</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(editando)} onOpenChange={(abierto) => { if (!abierto && !pending) setEditId(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar tarea</DialogTitle></DialogHeader>
          {editando ? (
            <div className="grid gap-4">
              <form className="grid gap-3" onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                data.set("id", editando.id)
                if (proyectoId) data.set("projectId", proyectoId)
                guardar(data, () => setEditId(null))
              }}>
                <Input name="title" defaultValue={editando.title} required minLength={3} aria-label="Título" />
                <select name="status" aria-label="Estado" defaultValue={editando.status} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
                  {COLUMNAS.map((columna) => <option key={columna.key} value={columna.key}>{columna.label}</option>)}
                </select>
                <select name="assigneeId" aria-label="Responsable de la tarea" defaultValue={editando.assigneeId} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
                  <option value="">Sin responsable</option>
                  {responsables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <Input name="dueDate" type="date" lang="es-CO" aria-label="Fecha límite" defaultValue={editando.dueDate ?? ""} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditId(null)} disabled={pending}>Cancelar</Button>
                  <Button type="submit" disabled={pending}>Guardar</Button>
                </DialogFooter>
              </form>
              <div className="grid gap-2 border-t border-[#E4E7EC] pt-3">
                <p className="text-sm font-medium">Subtareas</p>
                {editando.subtareas.length === 0 ? <p className="text-xs text-muted-foreground">Sin lista de verificación.</p> : editando.subtareas.map((sub) => (
                  <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className={sub.status === "HECHA" ? "line-through" : ""}>{sub.title}</span>
                    {puede && sub.status !== "HECHA" ? (
                      <form action={(data) => guardar(data)}>
                        <input type="hidden" name="id" value={sub.id} />
                        <input type="hidden" name="title" value={sub.title} />
                        <input type="hidden" name="status" value="HECHA" />
                        <input type="hidden" name="parentId" value={editando.id} />
                        {proyectoId ? <input type="hidden" name="projectId" value={proyectoId} /> : null}
                        <Button type="submit" size="sm" variant="outline" disabled={pending}>Marcar hecha</Button>
                      </form>
                    ) : <span className="text-muted-foreground">{sub.status === "HECHA" ? "Hecha" : "Pendiente"}</span>}
                  </div>
                ))}
                {puede ? (
                  <form className="grid gap-2" onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    data.set("status", "PENDIENTE")
                    data.set("parentId", editando.id)
                    if (proyectoId) data.set("projectId", proyectoId)
                    guardar(data)
                    event.currentTarget.reset()
                  }}>
                    <Input name="title" placeholder="Nueva subtarea" required minLength={3} />
                    <Button type="submit" size="sm" variant="outline" disabled={pending}>Agregar subtarea</Button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(confirma)} onOpenChange={(abierto) => { if (!abierto && !pending) setConfirma(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mover la tarea</DialogTitle></DialogHeader>
          {confirma ? (
            <label className="grid gap-1 text-sm">
              «{confirma.title}» pasará a
              <select aria-label="Columna de destino" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3" value={confirma.status} onChange={(event) => setConfirma({ ...confirma, status: event.target.value as Estado })}>
                {COLUMNAS.map((columna) => <option key={columna.key} value={columna.key}>{columna.label}</option>)}
              </select>
            </label>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirma(null)} disabled={pending}>Cancelar</Button>
            <Button type="button" onClick={aplicarMovimiento} disabled={pending || !confirma}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(borrar)} onOpenChange={(abierto) => { if (!abierto && !pending) setBorrar(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar</DialogTitle></DialogHeader>
          <p className="text-sm">{borrar ? textoEliminar(borrar) : null}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBorrar(null)} disabled={pending}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={eliminar} disabled={pending}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
