"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { EliminarTarea } from "@/components/confirmar-eliminar"
import { EstadoVacio } from "@/components/estado-vacio"
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
  fechaInicio?: string | null
  assignee: string
  vencida: boolean
  horasEstimadas?: number | null
  horasReales?: number | null
  kpiNombre?: string | null
  kpiMeta?: number | null
  kpiUnidad?: string | null
  kpiActual?: number | null
}

const ESTADOS = [
  { value: "PENDIENTE", label: "Por hacer" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "HECHA", label: "Hecho" },
] as const

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
  agentes: { id: string; name: string; grupo?: string }[]
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
      {tareas.length === 0 ? <EstadoVacio compacto titulo="Aún no hay tareas" texto="Agregue la primera tarea de esta solicitud." /> : tareas.map((tarea) => (
        <FilaTarea key={tarea.id} tarea={tarea} puede={puede} puedeEliminar={puedeEliminar} requestId={requestId} projectId={projectId} pending={pending} start={start} refrescar={() => router.refresh()} />
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
            <Elegir ariaLabel="Estado" value={status} onValueChange={(valor) => setStatus(valor as typeof status)} opciones={ESTADOS.map((item) => ({ value: item.value, label: item.label }))} />
            <Elegir ariaLabel="Responsable" value={assigneeId} onValueChange={setAssigneeId} placeholder="Sin responsable" opciones={[{ value: "", label: "Sin responsable" }, ...agentes.map((agente) => ({ value: agente.id, label: agente.name, iniciales: iniciales(agente.name), grupo: agente.grupo }))]} />
            <Input name="fechaInicio" type="date" lang="es-CO" aria-label="Fecha de inicio" />
            <Input name="dueDate" type="date" lang="es-CO" aria-label="Fecha de fin" />
            <Input name="horasEstimadas" inputMode="decimal" aria-label="Horas estimadas" placeholder="Horas estimadas" />
            <Input name="kpiNombre" aria-label="Nombre del KPI" placeholder="KPI (opcional)" />
            <Input name="kpiMeta" inputMode="decimal" aria-label="Meta del KPI" placeholder="Meta" />
            <Input name="kpiUnidad" aria-label="Unidad del KPI" placeholder="%, videos, leads" />
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

function FilaTarea({
  tarea,
  puede,
  puedeEliminar,
  requestId,
  projectId,
  pending,
  start,
  refrescar,
}: {
  tarea: TareaVista
  puede: boolean
  puedeEliminar: boolean
  requestId?: string
  projectId?: string
  pending: boolean
  start: (trabajo: () => Promise<void>) => void
  refrescar: () => void
}) {
  const inicial = tarea.horasEstimadas == null ? "" : String(tarea.horasEstimadas)
  const [horas, setHoras] = useState(inicial)
  const [aviso, setAviso] = useState<"idle" | "guardando" | "guardado">("idle")
  const [pedir, setPedir] = useState(false)
  const [trabajadas, setTrabajadas] = useState(tarea.horasReales == null ? "" : String(tarea.horasReales))
  const ultima = useRef(inicial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function guardar(extra: { status?: TareaVista["status"]; horasEstimadas?: string; horasReales?: string }) {
    const data = new FormData()
    data.set("id", tarea.id)
    data.set("title", tarea.title)
    data.set("status", extra.status ?? tarea.status)
    if (requestId) data.set("requestId", requestId)
    if (projectId) data.set("projectId", projectId)
    if (extra.horasEstimadas !== undefined) data.set("horasEstimadas", extra.horasEstimadas)
    if (extra.horasReales !== undefined) data.set("horasReales", extra.horasReales)
    setAviso("guardando")
    start(async () => {
      const result = await guardarTareaAction(data)
      if (!result.ok) {
        toast.error(result.error)
        setAviso("idle")
        return
      }
      setAviso("guardado")
      setPedir(false)
      refrescar()
    })
  }

  function alCambiarHoras(valor: string) {
    setHoras(valor)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (valor === ultima.current) return
      ultima.current = valor
      guardar({ horasEstimadas: valor })
    }, 600)
  }

  function cambiarEstado(status: TareaVista["status"]) {
    if (status === tarea.status) return
    if (status === "HECHA") {
      setPedir(true)
      return
    }
    guardar({ status })
  }

  return (
    <div id={`tarea-${tarea.id}`} className="grid gap-2 rounded-lg border border-[#E4E7EC] px-3 py-3 text-sm">
      <p className={tarea.status === "HECHA" ? "font-medium line-through" : "font-medium"}>{tarea.title}</p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Avatar nombre={tarea.assignee === "Sin responsable" ? "?" : tarea.assignee} />
        <span>{tarea.assignee}</span>
        <span>{tarea.fechaInicio ? `Inicio ${tarea.fechaInicio}` : "Sin inicio"}</span>
        <span>{tarea.dueDate ? `Fin ${tarea.dueDate}` : "Sin fin"}</span>
        <span>{tarea.horasEstimadas != null ? `${tarea.horasEstimadas} h est.` : "Sin horas"}</span>
        {tarea.kpiNombre ? <span>{tarea.kpiActual ?? "—"} / {tarea.kpiMeta ?? "—"} {tarea.kpiUnidad}</span> : null}
        {tarea.vencida ? <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">Vencida</span> : null}
        {puedeEliminar ? <EliminarTarea id={tarea.id} title={tarea.title} menu /> : null}
      </p>
      {puede ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E4E7EC] p-0.5" role="group" aria-label={`Estado de ${tarea.title}`}>
            {ESTADOS.map((item) => (
              <button key={item.value} type="button" disabled={pending} aria-pressed={tarea.status === item.value} className={tarea.status === item.value ? "rounded-md bg-[#1658B0] px-2.5 py-1 text-xs font-medium text-white" : "rounded-md px-2.5 py-1 text-xs text-[#3d4a63]"} onClick={() => cambiarEstado(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            Horas estimadas
            <input aria-label={`Horas estimadas de ${tarea.title}`} inputMode="decimal" value={horas} onChange={(event) => alCambiarHoras(event.target.value)} className="h-8 w-20 rounded-lg border border-[#E4E7EC] px-2" />
          </label>
          <span className="text-xs text-muted-foreground" aria-live="polite">{aviso === "guardando" ? "Guardando…" : aviso === "guardado" ? "Guardado" : ""}</span>
        </div>
      ) : <p className="text-xs text-muted-foreground">{ESTADOS.find((item) => item.value === tarea.status)?.label}</p>}
      {pedir ? (
        <div className="grid gap-2 rounded-lg bg-[#F8FAFD] p-3">
          <label className="grid gap-1 text-xs">
            Horas trabajadas
            <input aria-label="Horas trabajadas" inputMode="decimal" value={trabajadas} onChange={(event) => setTrabajadas(event.target.value)} className="h-9 rounded-lg border border-[#E4E7EC] px-2" />
          </label>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={() => guardar({ status: "HECHA", horasReales: trabajadas })}>Guardar</Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => guardar({ status: "HECHA" })}>Omitir</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
