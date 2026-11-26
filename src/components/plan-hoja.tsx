"use client"

import { useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/iconos-planer"
import {
  ESTADO_TAREA_LABEL,
  avanceKpi,
  estadosEditables,
  sumarHoras,
  textoKpi,
  type EstadoTareaPlan,
  type FilaPlan,
} from "@/lib/plan-trabajo"
import { crearActividadAction, deshacerAltaAction, editarMasivoAction, guardarCeldaAction, moverActividadAction, reordenarPlanAction } from "@/server/plan-actions"

const PILLS: Record<EstadoTareaPlan, string> = {
  PENDIENTE: "bg-[#F3F4F6] text-[#3d4a63]",
  EN_CURSO: "bg-[#E7F0FB] text-[#1658B0]",
  HECHA: "bg-emerald-100 text-emerald-800",
}

const CAMPOS = ["actividad", "responsable", "participantes", "estado", "bloqueo", "inicio", "fin", "horasEstimadas", "horasReales", "kpi", "proyecto", "area"] as const

type ProyectoPlan = { id: string; name: string; team: string | null; area: string; inicio: string; fin: string }
type Persona = { id: string; name: string; teams: string[] }
type Campo = (typeof CAMPOS)[number]

function fechaVisible(iso: string | null) {
  if (!iso) return ""
  const [anio, mes, dia] = iso.split("-")
  if (!anio || !mes || !dia) return iso
  return `${dia}/${mes}/${anio}`
}

function diaMs(iso: string) {
  return Date.parse(`${iso}T00:00:00Z`)
}

function isoDe(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function aviso(mensaje: string, deshacer: () => Promise<void>) {
  toast.success(mensaje, { duration: 5000, action: { label: "Deshacer", onClick: () => { void deshacer() } } })
}

export function PlanHoja({
  filas,
  proyectos,
  catalogo,
  responsables,
  onFormulario,
}: {
  filas: FilaPlan[]
  proyectos: ProyectoPlan[]
  catalogo: ProyectoPlan[]
  responsables: Persona[]
  onFormulario: (proyectoId: string) => void
}) {
  const router = useRouter()
  const [local, setLocal] = useState(filas)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [activa, setActiva] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [abierta, setAbierta] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  useEffect(() => { setLocal(filas) }, [filas])

  const porProyecto = useMemo(() => {
    const mapa = new Map<string, FilaPlan[]>()
    for (const fila of local) {
      const lista = mapa.get(fila.proyectoId) ?? []
      lista.push(fila)
      mapa.set(fila.proyectoId, lista)
    }
    return mapa
  }, [local])

  function gente(team: string | null) {
    return responsables.filter((persona) => !team || persona.teams.includes(team))
  }

  async function guardar(fila: FilaPlan, patch: Partial<FilaPlan>, envio: Parameters<typeof guardarCeldaAction>[0], campo: Campo) {
    const previo = fila
    setLocal((lista) => lista.map((item) => (item.id === fila.id ? { ...item, ...patch } : item)))
    setOcupada(`${fila.id}:${campo}`)
    const resultado = await guardarCeldaAction(envio)
    setOcupada(null)
    if (!resultado.ok) {
      setLocal((lista) => lista.map((item) => (item.id === fila.id ? previo : item)))
      toast.error(resultado.error)
      return
    }
    router.refresh()
    aviso("Cambio guardado.", async () => {
      setLocal((lista) => lista.map((item) => (item.id === fila.id ? previo : item)))
      const vuelta = await guardarCeldaAction({
        id: fila.id,
        ...(envio.title !== undefined ? { title: previo.actividad } : {}),
        ...(envio.status !== undefined ? { status: previo.estado } : {}),
        ...(envio.assigneeId !== undefined ? { assigneeId: previo.responsableId } : {}),
        ...(envio.participantes !== undefined ? { participantes: previo.participantes.join(", ") } : {}),
        ...(envio.bloqueo !== undefined ? { bloqueo: previo.bloqueo } : {}),
        ...(envio.fechaInicio !== undefined ? { fechaInicio: previo.inicio } : {}),
        ...(envio.fechaFin !== undefined ? { fechaFin: previo.fin } : {}),
        ...(envio.horasEstimadas !== undefined ? { horasEstimadas: previo.horasEstimadas == null ? "" : String(previo.horasEstimadas) } : {}),
        ...(envio.horasReales !== undefined ? { horasReales: previo.horasReales == null ? "" : String(previo.horasReales) } : {}),
        ...(envio.kpiNombre !== undefined ? { kpiNombre: previo.kpiNombre, kpiMeta: previo.kpiMeta == null ? "" : String(previo.kpiMeta), kpiUnidad: previo.kpiUnidad, kpiActual: previo.kpiActual == null ? "" : String(previo.kpiActual) } : {}),
        ...(envio.projectId !== undefined ? { projectId: previo.proyectoId } : {}),
      })
      if (!vuelta.ok) toast.error(vuelta.error)
    })
  }

  async function mover(id: string, projectId: string, parentId: string | null) {
    const fila = local.find((item) => item.id === id)
    const destino = catalogo.find((item) => item.id === projectId)
    if (!fila || !destino) return
    const previo = { proyectoId: fila.proyectoId, parentId: fila.parentId, proyecto: fila.proyecto, area: fila.area, team: fila.team }
    setLocal((lista) => lista.map((item) => {
      if (item.id !== id && item.parentId !== id) return item
      return { ...item, proyectoId: destino.id, proyecto: destino.name, area: destino.area, team: destino.team, ...(item.id === id ? { parentId } : {}) }
    }))
    const resultado = await moverActividadAction({ id, projectId, parentId })
    if (!resultado.ok) {
      setLocal((lista) => lista.map((item) => (item.id === id || item.parentId === id ? { ...item, ...previo, ...(item.id === id ? { parentId: previo.parentId } : {}) } : item)))
      toast.error(resultado.error)
      return
    }
    router.refresh()
    aviso("Actividad movida.", async () => {
      const vuelta = await moverActividadAction({ id, projectId: previo.proyectoId, parentId: previo.parentId })
      if (!vuelta.ok) toast.error(vuelta.error)
      else setLocal((lista) => lista.map((item) => (item.id === id ? { ...item, ...previo } : item)))
    })
  }

  async function reordenar(ids: string[]) {
    const previos = local.filter((item) => ids.includes(item.id)).map((item) => item.id)
    setLocal((lista) => lista.map((item) => {
      const indice = ids.indexOf(item.id)
      return indice === -1 ? item : { ...item, orden: indice }
    }))
    const resultado = await reordenarPlanAction(ids)
    if (!resultado.ok) {
      toast.error(resultado.error)
      return
    }
    router.refresh()
    aviso("Orden actualizado.", async () => {
      const vuelta = await reordenarPlanAction(previos)
      if (!vuelta.ok) toast.error(vuelta.error)
    })
  }

  function alSoltar(event: DragEndEvent) {
    setActiva(null)
    const id = String(event.active.id)
    const sobre = event.over ? String(event.over.id) : ""
    if (!sobre || sobre === id) return
    if (sobre.startsWith("proy-")) {
      void mover(id, sobre.slice(5), null)
      return
    }
    const origen = String(event.active.data.current?.sortable?.containerId || "")
    const destino = String(event.over?.data.current?.sortable?.containerId || "")
    const fila = local.find((item) => item.id === id)
    if (!fila || !destino) return
    if (destino === origen) {
      const ids = local.filter((item) => (origen.startsWith("hijos-") ? item.parentId === origen.slice(6) : item.proyectoId === origen.slice(5) && !local.some((otra) => otra.id === item.parentId))).sort((a, b) => a.orden - b.orden).map((item) => item.id)
      const desde = ids.indexOf(id)
      const hacia = ids.indexOf(sobre)
      if (desde < 0 || hacia < 0) return
      void reordenar(arrayMove(ids, desde, hacia))
      return
    }
    if (destino.startsWith("hijos-")) {
      void mover(id, fila.proyectoId, destino.slice(6))
      return
    }
    if (destino.startsWith("raiz-")) void mover(id, destino.slice(5), null)
  }

  async function aplicarMasivo(patch: { assigneeId?: string | null; status?: string; fechaInicio?: string | null; fechaFin?: string | null; projectId?: string }) {
    const ids = [...seleccion]
    const copias = local.filter((item) => ids.includes(item.id))
    const resultado = await editarMasivoAction({ ids, ...patch })
    if (!resultado.ok) {
      toast.error(resultado.error)
      return
    }
    router.refresh()
    setLocal((lista) => lista.map((item) => {
      if (!ids.includes(item.id)) return item
      const destino = patch.projectId ? catalogo.find((proyecto) => proyecto.id === patch.projectId) : null
      const persona = patch.assigneeId ? responsables.find((entrada) => entrada.id === patch.assigneeId) : null
      return {
        ...item,
        ...(patch.status ? { estado: patch.status as EstadoTareaPlan } : {}),
        ...(patch.fechaInicio !== undefined ? { inicio: patch.fechaInicio } : {}),
        ...(patch.fechaFin !== undefined ? { fin: patch.fechaFin } : {}),
        ...(patch.assigneeId !== undefined ? { responsableId: patch.assigneeId, responsable: persona?.name || "Sin asignar" } : {}),
        ...(destino ? { proyectoId: destino.id, proyecto: destino.name, area: destino.area, team: destino.team } : {}),
      }
    }))
    aviso("Actividades actualizadas.", async () => {
      for (const copia of copias) {
        await guardarCeldaAction({
          id: copia.id,
          ...(patch.status ? { status: copia.estado } : {}),
          ...(patch.fechaInicio !== undefined ? { fechaInicio: copia.inicio } : {}),
          ...(patch.fechaFin !== undefined ? { fechaFin: copia.fin } : {}),
          ...(patch.assigneeId !== undefined ? { assigneeId: copia.responsableId } : {}),
          ...(patch.projectId ? { projectId: copia.proyectoId } : {}),
        })
      }
    })
  }

  async function crearRapida(proyectoId: string, titulo: string) {
    const data = new FormData()
    data.set("proyectoId", proyectoId)
    data.set("titulo", titulo)
    const resultado = await crearActividadAction(data)
    if (!resultado.ok) {
      toast.error(resultado.error)
      return
    }
    router.refresh()
    if (resultado.id) {
      aviso("Actividad agregada.", async () => {
        const vuelta = await deshacerAltaAction(resultado.id || "")
        if (!vuelta.ok) toast.error(vuelta.error)
      })
    }
  }

  const arrastrada = local.find((item) => item.id === activa) ?? null
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(event) => setActiva(String(event.active.id))} onDragEnd={alSoltar} onDragCancel={() => setActiva(null)}>
      <div className="max-h-[calc(100vh-16rem)] overflow-auto rounded-xl border border-[#E4E7EC] bg-white">
        <table className="w-full min-w-[1680px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-20 bg-[#F8FAFD] text-xs text-muted-foreground">
            <tr>
              <th className="w-8 border-b border-[#E4E7EC] px-2 py-2" />
              <th className="w-8 border-b border-[#E4E7EC] px-2 py-2"><input type="checkbox" aria-label="Seleccionar visibles" checked={seleccion.length > 0 && seleccion.length === local.length} onChange={(event) => setSeleccion(event.target.checked ? local.map((item) => item.id) : [])} /></th>
              {["Proyecto", "Área", "Actividad", "Responsable", "Participantes", "Estado", "Bloqueo", "Inicio", "Fin", "Horas est.", "Horas reales", "KPI", "Calendario", ""].map((columna) => (
                <th key={columna || "mover"} className="border-b border-[#E4E7EC] px-3 py-2 font-medium whitespace-nowrap">{columna}</th>
              ))}
            </tr>
          </thead>
          {proyectos.map((proyecto) => (
            <Grupo key={proyecto.id} proyecto={proyecto} filas={(porProyecto.get(proyecto.id) ?? []).slice().sort((a, b) => a.orden - b.orden)} catalogo={catalogo} gente={gente} ocupada={ocupada} abierta={abierta} setAbierta={setAbierta} seleccion={seleccion} setSeleccion={setSeleccion} guardar={guardar} onFormulario={onFormulario} onCrear={crearRapida} reordenar={reordenar} mover={mover} />
          ))}
        </table>
      </div>
      <DragOverlay>{arrastrada ? <div className="rounded-lg border border-[#1658B0] bg-white px-3 py-2 text-sm shadow-lg">{arrastrada.actividad}</div> : null}</DragOverlay>
      {seleccion.length > 0 ? <BarraMasiva cantidad={seleccion.length} catalogo={catalogo} responsables={responsables} onAplicar={aplicarMasivo} onCerrar={() => setSeleccion([])} /> : null}
    </DndContext>
  )
}

function Grupo({
  proyecto,
  filas,
  catalogo,
  gente,
  ocupada,
  abierta,
  setAbierta,
  seleccion,
  setSeleccion,
  guardar,
  onFormulario,
  onCrear,
  reordenar,
  mover,
}: {
  proyecto: ProyectoPlan
  filas: FilaPlan[]
  catalogo: ProyectoPlan[]
  gente: (team: string | null) => Persona[]
  ocupada: string | null
  abierta: string | null
  setAbierta: (id: string | null) => void
  seleccion: string[]
  setSeleccion: (ids: string[]) => void
  guardar: (fila: FilaPlan, patch: Partial<FilaPlan>, envio: Parameters<typeof guardarCeldaAction>[0], campo: Campo) => Promise<void>
  onFormulario: (proyectoId: string) => void
  onCrear: (proyectoId: string, titulo: string) => Promise<void>
  reordenar: (ids: string[]) => Promise<void>
  mover: (id: string, projectId: string, parentId: string | null) => Promise<void>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `proy-${proyecto.id}` })
  const visibles = new Set(filas.map((item) => item.id))
  const raices = filas.filter((item) => !item.parentId || !visibles.has(item.parentId))
  const total = sumarHoras(filas)
  return (
    <tbody>
      <tr ref={setNodeRef} className={isOver ? "bg-[#E7F0FB]" : "bg-[#F4F8FE]"}>
        <td colSpan={16} className="border-b border-[#E4E7EC] px-3 py-2 font-medium">
          <Link href={`/proyectos/${proyecto.id}`} className="text-[#1658B0] hover:underline">{proyecto.name}</Link>
          <span className="ml-2 text-sm font-normal text-[#3d4a63]">{proyecto.area}</span>
          {isOver ? <span className="ml-2 text-xs text-[#1658B0]">Soltar para mover aquí</span> : null}
        </td>
      </tr>
      <SortableContext id={`raiz-${proyecto.id}`} items={raices.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {raices.map((fila) => {
          const hijos = filas.filter((item) => item.parentId === fila.id)
          return (
            <FilaGrupo key={fila.id} fila={fila} hijos={hijos} raices={raices} proyecto={proyecto} catalogo={catalogo} gente={gente(fila.team)} ocupada={ocupada} abierta={abierta} setAbierta={setAbierta} seleccion={seleccion} setSeleccion={setSeleccion} guardar={guardar} reordenar={reordenar} mover={mover} />
          )
        })}
      </SortableContext>
      <tr className="bg-[#F8FAFD] text-xs font-medium text-[#3d4a63]">
        <td colSpan={11} className="border-b border-[#E4E7EC] px-3 py-2">Total {proyecto.name}</td>
        <td className="border-b border-[#E4E7EC] px-3 py-2 tabular-nums">{total.estimadas}</td>
        <td className="border-b border-[#E4E7EC] px-3 py-2 tabular-nums">{total.reales}</td>
        <td colSpan={3} className="border-b border-[#E4E7EC]" />
      </tr>
      <tr>
        <td colSpan={16} className="border-b border-[#E4E7EC] px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <AltaRapida nombre={proyecto.name} onCrear={(titulo) => onCrear(proyecto.id, titulo)} />
            <button type="button" className="text-sm font-medium text-[#1658B0]" onClick={() => onFormulario(proyecto.id)}>+ Agregar actividad</button>
          </div>
        </td>
      </tr>
    </tbody>
  )
}

function FilaGrupo(props: {
  fila: FilaPlan
  hijos: FilaPlan[]
  raices: FilaPlan[]
  proyecto: ProyectoPlan
  catalogo: ProyectoPlan[]
  gente: Persona[]
  ocupada: string | null
  abierta: string | null
  setAbierta: (id: string | null) => void
  seleccion: string[]
  setSeleccion: (ids: string[]) => void
  guardar: (fila: FilaPlan, patch: Partial<FilaPlan>, envio: Parameters<typeof guardarCeldaAction>[0], campo: Campo) => Promise<void>
  reordenar: (ids: string[]) => Promise<void>
  mover: (id: string, projectId: string, parentId: string | null) => Promise<void>
}) {
  return (
    <>
      <FilaArrastrable {...props} anidada={false} />
      <SortableContext id={`hijos-${props.fila.id}`} items={props.hijos.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {props.hijos.map((hijo) => <FilaArrastrable key={hijo.id} {...props} fila={hijo} anidada />)}
      </SortableContext>
    </>
  )
}

function FilaArrastrable({ fila, anidada, raices, hijos, catalogo, gente, ocupada, abierta, setAbierta, seleccion, setSeleccion, guardar, reordenar, mover }: {
  fila: FilaPlan
  anidada: boolean
  raices: FilaPlan[]
  hijos: FilaPlan[]
  catalogo: ProyectoPlan[]
  gente: Persona[]
  ocupada: string | null
  abierta: string | null
  setAbierta: (id: string | null) => void
  seleccion: string[]
  setSeleccion: (ids: string[]) => void
  guardar: (fila: FilaPlan, patch: Partial<FilaPlan>, envio: Parameters<typeof guardarCeldaAction>[0], campo: Campo) => Promise<void>
  reordenar: (ids: string[]) => Promise<void>
  mover: (id: string, projectId: string, parentId: string | null) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fila.id, disabled: !fila.puedeEditar, data: { parentId: fila.parentId } })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }
  const celda = (campo: Campo) => `${fila.id}:${campo}`
  function siguiente(campo: Campo) {
    const indice = CAMPOS.indexOf(campo)
    const proxima = CAMPOS[indice + 1]
    if (!proxima) return
    setAbierta(celda(proxima))
  }
  return (
    <tr ref={setNodeRef} style={style} className="align-middle">
      <td className="border-b border-[#F0F2F5] px-1">
        {fila.puedeEditar ? <button type="button" className="inline-flex size-8 cursor-grab items-center justify-center text-[#98A2B3]" aria-label={`Arrastrar ${fila.actividad}`} {...attributes} {...listeners}><GripVerticalIcon className="size-4" /></button> : <span className="inline-flex size-8" title="Solo el líder del área o un administrador mueve esta fila." />}
      </td>
      <td className="border-b border-[#F0F2F5] px-2"><input type="checkbox" aria-label={`Seleccionar ${fila.actividad}`} checked={seleccion.includes(fila.id)} onChange={(event) => setSeleccion(event.target.checked ? [...seleccion, fila.id] : seleccion.filter((id) => id !== fila.id))} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaProyecto fila={fila} catalogo={catalogo} campo="proyecto" abierta={abierta === celda("proyecto")} ocupada={ocupada === celda("proyecto")} onAbrir={() => setAbierta(celda("proyecto"))} onCerrar={() => setAbierta(null)} onGuardar={(proyecto) => guardar(fila, { proyectoId: proyecto.id, proyecto: proyecto.name, area: proyecto.area, team: proyecto.team }, { id: fila.id, projectId: proyecto.id }, "proyecto")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaProyecto fila={fila} catalogo={catalogo} campo="area" abierta={abierta === celda("area")} ocupada={ocupada === celda("area")} onAbrir={() => setAbierta(celda("area"))} onCerrar={() => setAbierta(null)} onGuardar={(proyecto) => guardar(fila, { proyectoId: proyecto.id, proyecto: proyecto.name, area: proyecto.area, team: proyecto.team }, { id: fila.id, projectId: proyecto.id }, "area")} /></td>
      <td className={`border-b border-[#F0F2F5] px-3 py-1 ${anidada ? "pl-8" : ""}`}>
        <CeldaTexto valor={fila.actividad} editable={fila.puedeEditar} tooltip="Solo el líder del área o un administrador edita esta celda." ocupada={ocupada === celda("actividad")} abierta={abierta === celda("actividad")} onAbrir={() => setAbierta(celda("actividad"))} onCerrar={() => setAbierta(null)} onTab={() => siguiente("actividad")} onGuardar={(valor) => guardar(fila, { actividad: valor }, { id: fila.id, title: valor }, "actividad")} />
        <Link href={`/proyectos/${fila.proyectoId}#tarea-${fila.id}`} className="ml-2 text-xs text-[#98A2B3] hover:underline">Abrir</Link>
      </td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaResponsable fila={fila} gente={gente} abierta={abierta === celda("responsable")} ocupada={ocupada === celda("responsable")} onAbrir={() => setAbierta(celda("responsable"))} onCerrar={() => setAbierta(null)} onGuardar={(persona) => guardar(fila, { responsableId: persona?.id ?? null, responsable: persona?.name || "Sin asignar" }, { id: fila.id, assigneeId: persona?.id ?? null }, "responsable")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaParticipantes fila={fila} gente={gente} abierta={abierta === celda("participantes")} ocupada={ocupada === celda("participantes")} onAbrir={() => setAbierta(celda("participantes"))} onCerrar={() => setAbierta(null)} onGuardar={(nombres) => guardar(fila, { participantes: nombres }, { id: fila.id, participantes: nombres.join(", ") }, "participantes")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaEstado fila={fila} abierta={abierta === celda("estado")} ocupada={ocupada === celda("estado")} onAbrir={() => setAbierta(celda("estado"))} onCerrar={() => setAbierta(null)} onGuardar={(estado) => guardar(fila, { estado }, { id: fila.id, status: estado }, "estado")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaTexto valor={fila.bloqueo} placeholder="—" editable={fila.puedeEditar} tooltip="Solo el líder del área o un administrador edita el bloqueo." ocupada={ocupada === celda("bloqueo")} abierta={abierta === celda("bloqueo")} limpiar onAbrir={() => setAbierta(celda("bloqueo"))} onCerrar={() => setAbierta(null)} onTab={() => siguiente("bloqueo")} onGuardar={(valor) => guardar(fila, { bloqueo: valor }, { id: fila.id, bloqueo: valor }, "bloqueo")} rojo /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1 whitespace-nowrap"><CeldaFecha valor={fila.inicio} respaldo={fila.inicioProyecto} editable={fila.puedeEditar} ocupada={ocupada === celda("inicio")} abierta={abierta === celda("inicio")} onAbrir={() => setAbierta(celda("inicio"))} onCerrar={() => setAbierta(null)} onGuardar={(valor) => guardar(fila, { inicio: valor }, { id: fila.id, fechaInicio: valor }, "inicio")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1 whitespace-nowrap"><CeldaFecha valor={fila.fin} respaldo={fila.finProyecto} editable={fila.puedeEditar} ocupada={ocupada === celda("fin")} abierta={abierta === celda("fin")} onAbrir={() => setAbierta(celda("fin"))} onCerrar={() => setAbierta(null)} onGuardar={(valor) => guardar(fila, { fin: valor }, { id: fila.id, fechaFin: valor }, "fin")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaNumero valor={fila.horasEstimadas} editable={fila.puedeEditar} tooltip="Solo el líder del área edita las horas estimadas." ocupada={ocupada === celda("horasEstimadas")} abierta={abierta === celda("horasEstimadas")} onAbrir={() => setAbierta(celda("horasEstimadas"))} onCerrar={() => setAbierta(null)} onGuardar={(valor) => guardar(fila, { horasEstimadas: valor === "" ? null : Number(valor) }, { id: fila.id, horasEstimadas: valor }, "horasEstimadas")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaNumero valor={fila.horasReales} editable={fila.puedeEditar || fila.puedeRegistrar} tooltip={fila.puedeRegistrar ? "" : "Solo el responsable registra las horas reales."} ocupada={ocupada === celda("horasReales")} abierta={abierta === celda("horasReales")} onAbrir={() => setAbierta(celda("horasReales"))} onCerrar={() => setAbierta(null)} onGuardar={(valor) => guardar(fila, { horasReales: valor === "" ? null : Number(valor) }, { id: fila.id, horasReales: valor }, "horasReales")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><CeldaKpi fila={fila} abierta={abierta === celda("kpi")} ocupada={ocupada === celda("kpi")} onAbrir={() => setAbierta(celda("kpi"))} onCerrar={() => setAbierta(null)} onGuardar={(valor) => guardar(fila, valor.patch, fila.puedeEditar ? { id: fila.id, ...valor.envio } : { id: fila.id, kpiActual: valor.envio.kpiActual }, "kpi")} /></td>
      <td className="border-b border-[#F0F2F5] px-3 py-1"><BarraGantt fila={fila} onCambio={(inicio, fin) => guardar(fila, { inicio, fin }, { id: fila.id, fechaInicio: inicio, fechaFin: fin }, "inicio")} /></td>
      <td className="border-b border-[#F0F2F5] px-2 py-1"><MenuMover fila={fila} hermanos={(anidada ? hijos : raices).map((item) => item.id)} onReordenar={reordenar} onAnidar={() => { const anterior = raices[raices.findIndex((item) => item.id === fila.id) - 1]; if (anterior) void mover(fila.id, fila.proyectoId, anterior.id) }} onSacar={() => { if (fila.parentId) void mover(fila.id, fila.proyectoId, null) }} /></td>
    </tr>
  )
}

function MenuMover({ fila, hermanos, onReordenar, onAnidar, onSacar }: { fila: FilaPlan; hermanos: string[]; onReordenar: (ids: string[]) => Promise<void>; onAnidar: () => void; onSacar: () => void }) {
  if (!fila.puedeEditar) return <span title="Solo el líder del área o un administrador mueve esta fila." className="text-xs text-[#98A2B3]">—</span>
  const indice = hermanos.indexOf(fila.id)
  function desplazar(hacia: -1 | 1) {
    const destino = indice + hacia
    if (destino < 0 || destino >= hermanos.length) return
    const ids = [...hermanos]
    const [actual] = ids.splice(indice, 1)
    if (actual) ids.splice(destino, 0, actual)
    void onReordenar(ids)
  }
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-xs font-medium text-[#1658B0]">Mover</summary>
      <div className="absolute right-0 z-30 mt-1 grid w-52 gap-1 rounded-lg border border-[#E4E7EC] bg-white p-1 text-xs shadow-lg">
        <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#F4F8FE]" onClick={() => desplazar(-1)}>Subir</button>
        <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#F4F8FE]" onClick={() => desplazar(1)}>Bajar</button>
        <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#F4F8FE]" onClick={onAnidar}>Hacer subtarea de la anterior</button>
        <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#F4F8FE]" onClick={onSacar}>Sacar al proyecto</button>
      </div>
    </details>
  )
}

function bloqueada(editable: boolean, tooltip: string, children: ReactNode) {
  if (editable) return children
  return <span title={tooltip || "Solo el líder del área o un administrador edita esta celda."} className="cursor-not-allowed">{children}</span>
}

function Giro({ activo }: { activo: boolean }) {
  if (!activo) return null
  return <Loader2Icon className="size-3 animate-spin text-[#1658B0]" aria-label="Guardando" />
}

function teclas(event: KeyboardEvent, guardar: () => void, cerrar: () => void, tab?: () => void) {
  if (event.key === "Escape") { event.preventDefault(); cerrar() }
  if (event.key === "Enter") { event.preventDefault(); guardar() }
  if (event.key === "Tab") { event.preventDefault(); guardar(); tab?.() }
}

function CeldaTexto({ valor, editable, tooltip, ocupada, abierta, onAbrir, onCerrar, onGuardar, onTab, placeholder = "—", limpiar = false, rojo = false }: {
  valor: string
  editable: boolean
  tooltip: string
  ocupada: boolean
  abierta: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (valor: string) => void
  onTab?: () => void
  placeholder?: string
  limpiar?: boolean
  rojo?: boolean
}) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => { setTexto(valor) }, [valor])
  if (!abierta) {
    return bloqueada(editable, tooltip, <button type="button" disabled={!editable} className={`inline-flex items-center gap-1 text-left ${rojo && valor ? "font-medium text-red-700" : ""}`} onClick={onAbrir}>{valor || <span className="text-[#98A2B3]">{placeholder}</span>}<Giro activo={ocupada} /></button>)
  }
  return (
    <span className="flex items-center gap-1">
      <input autoFocus value={texto} aria-label="Editar celda" onChange={(event) => setTexto(event.target.value)} onBlur={() => { onGuardar(texto); onCerrar() }} onKeyDown={(event) => teclas(event, () => { onGuardar(texto); onCerrar() }, () => { setTexto(valor); onCerrar() }, onTab)} className="h-9 w-full min-w-36 rounded-md border border-[#1658B0] px-2" />
      {limpiar ? <button type="button" className="text-xs text-[#1658B0]" onMouseDown={(event) => event.preventDefault()} onClick={() => { onGuardar(""); onCerrar() }}>Quitar</button> : null}
    </span>
  )
}

function CeldaNumero({ valor, editable, tooltip, ocupada, abierta, onAbrir, onCerrar, onGuardar }: {
  valor: number | null
  editable: boolean
  tooltip: string
  ocupada: boolean
  abierta: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (valor: string) => void
}) {
  const [texto, setTexto] = useState(valor == null ? "" : String(valor))
  useEffect(() => { setTexto(valor == null ? "" : String(valor)) }, [valor])
  if (!abierta) return bloqueada(editable, tooltip, <button type="button" disabled={!editable} className="inline-flex items-center gap-1 tabular-nums" onClick={onAbrir}>{valor ?? "—"}<Giro activo={ocupada} /></button>)
  return <input autoFocus inputMode="decimal" aria-label="Editar número" value={texto} onChange={(event) => setTexto(event.target.value)} onBlur={() => { onGuardar(texto); onCerrar() }} onKeyDown={(event) => teclas(event, () => { onGuardar(texto); onCerrar() }, () => onCerrar())} className="h-9 w-20 rounded-md border border-[#1658B0] px-2" />
}

function CeldaFecha({ valor, respaldo, editable, ocupada, abierta, onAbrir, onCerrar, onGuardar }: {
  valor: string | null
  respaldo: string | null
  editable: boolean
  ocupada: boolean
  abierta: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (valor: string | null) => void
}) {
  if (!abierta) {
    const propia = Boolean(valor)
    return bloqueada(editable, "Solo el líder del área edita las fechas.", <button type="button" disabled={!editable} className={`inline-flex items-center gap-1 whitespace-nowrap ${propia ? "" : "text-[#98A2B3]"}`} onClick={onAbrir}>{fechaVisible(valor || respaldo) || "—"}<Giro activo={ocupada} /></button>)
  }
  return <input autoFocus type="date" lang="es-CO" aria-label="Editar fecha" defaultValue={valor ?? ""} onBlur={(event) => { onGuardar(event.target.value || null); onCerrar() }} onKeyDown={(event) => teclas(event, () => { onGuardar((event.target as HTMLInputElement).value || null); onCerrar() }, () => onCerrar())} className="h-9 w-40 min-w-40 rounded-md border border-[#1658B0] px-2" />
}

function CeldaResponsable({ fila, gente, abierta, ocupada, onAbrir, onCerrar, onGuardar }: {
  fila: FilaPlan
  gente: Persona[]
  abierta: boolean
  ocupada: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (persona: Persona | null) => void
}) {
  const [q, setQ] = useState("")
  const lista = gente.filter((persona) => persona.name.toLowerCase().includes(q.trim().toLowerCase()))
  if (!abierta) {
    return bloqueada(fila.puedeEditar, "Solo el líder del área asigna el responsable.", <button type="button" disabled={!fila.puedeEditar} className="inline-flex items-center gap-2 text-left" onClick={onAbrir}>{fila.responsableId ? <><Avatar nombre={fila.responsable} />{fila.responsable}</> : <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 font-medium text-[#92400E]">Sin asignar</span>}<Giro activo={ocupada} /></button>)
  }
  return (
    <div className="relative">
      <input autoFocus value={q} aria-label="Buscar responsable" placeholder="Buscar" onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onCerrar() }} className="h-9 w-44 rounded-md border border-[#1658B0] px-2" />
      <ul className="absolute z-30 mt-1 max-h-52 w-56 overflow-auto rounded-lg border border-[#E4E7EC] bg-white p-1 shadow-lg">
        <li><button type="button" className="flex w-full rounded-md px-2 py-1 text-left hover:bg-[#F4F8FE]" onClick={() => { onGuardar(null); onCerrar() }}>Sin asignar</button></li>
        {lista.map((persona) => (
          <li key={persona.id}><button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-[#F4F8FE]" onClick={() => { onGuardar(persona); onCerrar() }}><Avatar nombre={persona.name} />{persona.name}</button></li>
        ))}
      </ul>
    </div>
  )
}

function CeldaParticipantes({ fila, gente, abierta, ocupada, onAbrir, onCerrar, onGuardar }: {
  fila: FilaPlan
  gente: Persona[]
  abierta: boolean
  ocupada: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (nombres: string[]) => void
}) {
  const [nombres, setNombres] = useState(fila.participantes)
  useEffect(() => { setNombres(fila.participantes) }, [fila.participantes])
  if (!abierta) return bloqueada(fila.puedeEditar, "Solo el líder del área edita los participantes.", <button type="button" disabled={!fila.puedeEditar} className="inline-flex max-w-52 flex-wrap gap-1 text-left" onClick={onAbrir}>{nombres.length === 0 ? <span className="text-[#98A2B3]">—</span> : nombres.map((nombre) => <span key={nombre} className="rounded-full bg-[#E7F0FB] px-2 py-0.5 text-xs text-[#1658B0]">{nombre}</span>)}<Giro activo={ocupada} /></button>)
  function alternar(nombre: string) {
    setNombres((lista) => lista.includes(nombre) ? lista.filter((item) => item !== nombre) : [...lista, nombre])
  }
  return (
    <div className="relative">
      <div className="absolute z-30 w-56 rounded-lg border border-[#E4E7EC] bg-white p-2 shadow-lg">
        <ul className="max-h-40 overflow-auto">
          {gente.map((persona) => (
            <li key={persona.id}><label className="flex items-center gap-2 py-1"><input type="checkbox" checked={nombres.includes(persona.name)} onChange={() => alternar(persona.name)} />{persona.name}</label></li>
          ))}
        </ul>
        <button type="button" className="mt-2 h-8 rounded-md bg-[#1658B0] px-2 text-xs text-white" onClick={() => { onGuardar(nombres); onCerrar() }}>Guardar</button>
      </div>
    </div>
  )
}

function CeldaEstado({ fila, abierta, ocupada, onAbrir, onCerrar, onGuardar }: {
  fila: FilaPlan
  abierta: boolean
  ocupada: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (estado: EstadoTareaPlan) => void
}) {
  if (!abierta) return bloqueada(fila.puedeEditar, "Solo el líder del área cambia el estado.", <button type="button" disabled={!fila.puedeEditar} className="inline-flex items-center gap-1" onClick={onAbrir}><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILLS[fila.estado]}`}>{ESTADO_TAREA_LABEL[fila.estado]}</span><Giro activo={ocupada} /></button>)
  return (
    <div className="flex flex-col gap-1">
      {estadosEditables(fila.estado).map((estado) => (
        <button key={estado} type="button" className={`rounded-full px-2 py-0.5 text-left text-xs font-medium ${PILLS[estado]}`} onClick={() => { onGuardar(estado); onCerrar() }}>{ESTADO_TAREA_LABEL[estado]}</button>
      ))}
    </div>
  )
}

function CeldaKpi({ fila, abierta, ocupada, onAbrir, onCerrar, onGuardar }: {
  fila: FilaPlan
  abierta: boolean
  ocupada: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (valor: { patch: Partial<FilaPlan>; envio: { kpiNombre: string; kpiMeta: string; kpiUnidad: string; kpiActual: string } }) => void
}) {
  const texto = textoKpi(fila)
  const avance = avanceKpi(fila.kpiActual, fila.kpiMeta)
  const soloActual = fila.puedeRegistrar && !fila.puedeEditar
  if (!abierta) {
    return bloqueada(fila.puedeEditar || fila.puedeRegistrar, "Solo el responsable registra el valor actual del KPI.", <button type="button" disabled={!fila.puedeEditar && !fila.puedeRegistrar} className="min-w-28 text-left" onClick={onAbrir}>{texto ? <><p className="text-xs text-[#3d4a63]">{fila.kpiNombre}</p><p className="text-xs">{texto}</p><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#E7F0FB]"><span className="block h-full bg-[#1658B0]" style={{ width: `${avance}%` }} /></span></> : <span className="text-[#98A2B3]">—</span>}<Giro activo={ocupada} /></button>)
  }
  return (
    <form className="grid w-56 gap-1 rounded-lg border border-[#E4E7EC] bg-white p-2 shadow-lg" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const kpiNombre = String(data.get("kpiNombre") || "")
      const kpiMeta = String(data.get("kpiMeta") || "")
      const kpiUnidad = String(data.get("kpiUnidad") || "")
      const kpiActual = String(data.get("kpiActual") || "")
      onGuardar({
        patch: { kpiNombre, kpiUnidad, kpiMeta: kpiMeta === "" ? null : Number(kpiMeta), kpiActual: kpiActual === "" ? null : Number(kpiActual) },
        envio: { kpiNombre, kpiMeta, kpiUnidad, kpiActual },
      })
      onCerrar()
    }}>
      {soloActual ? null : <input name="kpiNombre" aria-label="Nombre del KPI" defaultValue={fila.kpiNombre} placeholder="Nombre" className="h-8 rounded-md border border-[#E4E7EC] px-2" />}
      {soloActual ? <input type="hidden" name="kpiNombre" value={fila.kpiNombre} /> : null}
      {soloActual ? <input type="hidden" name="kpiMeta" value={fila.kpiMeta ?? ""} /> : <input name="kpiMeta" aria-label="Meta" defaultValue={fila.kpiMeta ?? ""} placeholder="Meta" className="h-8 rounded-md border border-[#E4E7EC] px-2" />}
      {soloActual ? <input type="hidden" name="kpiUnidad" value={fila.kpiUnidad} /> : <input name="kpiUnidad" aria-label="Unidad" defaultValue={fila.kpiUnidad} placeholder="Unidad" className="h-8 rounded-md border border-[#E4E7EC] px-2" />}
      <input name="kpiActual" aria-label="Actual" defaultValue={fila.kpiActual ?? ""} placeholder="Actual" className="h-8 rounded-md border border-[#E4E7EC] px-2" />
      <button className="h-8 rounded-md bg-[#1658B0] text-xs text-white" type="submit">Guardar</button>
    </form>
  )
}

function CeldaProyecto({ fila, catalogo, campo, abierta, ocupada, onAbrir, onCerrar, onGuardar }: {
  fila: FilaPlan
  catalogo: ProyectoPlan[]
  campo: "proyecto" | "area"
  abierta: boolean
  ocupada: boolean
  onAbrir: () => void
  onCerrar: () => void
  onGuardar: (proyecto: ProyectoPlan) => void
}) {
  const texto = campo === "proyecto" ? fila.proyecto : fila.area
  if (!abierta) return bloqueada(fila.puedeEditar, "Solo el líder del área mueve la actividad.", <button type="button" disabled={!fila.puedeEditar} className="inline-flex items-center gap-1 text-left" onClick={onAbrir}>{texto}<Giro activo={ocupada} /></button>)
  return (
    <select autoFocus aria-label={campo === "proyecto" ? "Proyecto" : "Área"} defaultValue={fila.proyectoId} onChange={(event) => { const proyecto = catalogo.find((item) => item.id === event.target.value); if (proyecto) onGuardar(proyecto); onCerrar() }} onBlur={onCerrar} onKeyDown={(event) => { if (event.key === "Escape") onCerrar() }} className="h-9 w-44 rounded-md border border-[#1658B0] bg-white px-2">
      {catalogo.map((item) => <option key={item.id} value={item.id}>{campo === "area" ? `${item.area} · ${item.name}` : item.name}</option>)}
    </select>
  )
}

function BarraGantt({ fila, onCambio }: { fila: FilaPlan; onCambio: (inicio: string, fin: string) => void }) {
  const inicio = fila.inicio
  const fin = fila.fin
  if (!inicio || !fin || !fila.puedeEditar) {
    return <span className="text-xs text-[#98A2B3]" title={fila.puedeEditar ? "Indique inicio y fin para mover la barra." : "Solo el líder del área mueve las fechas."}>{inicio && fin ? fechaVisible(inicio) : "Sin fechas"}</span>
  }
  const escalaInicio = fila.inicioProyecto && diaMs(fila.inicioProyecto) < diaMs(inicio) ? fila.inicioProyecto : inicio
  const escalaFin = fila.finProyecto && diaMs(fila.finProyecto) > diaMs(fin) ? fila.finProyecto : fin
  const span = Math.max(1, (diaMs(escalaFin) - diaMs(escalaInicio)) / 86_400_000)
  const left = ((diaMs(inicio) - diaMs(escalaInicio)) / 86_400_000 / span) * 100
  const width = Math.max(8, ((diaMs(fin) - diaMs(inicio)) / 86_400_000 / span) * 100)
  function mover(event: PointerEvent<HTMLSpanElement>, modo: "mover" | "inicio" | "fin") {
    if (!fila.inicio || !fila.fin) return
    event.preventDefault()
    event.stopPropagation()
    const ancho = (event.currentTarget.parentElement as HTMLElement).clientWidth || 140
    const origen = event.clientX
    const baseInicio = diaMs(fila.inicio)
    const baseFin = diaMs(fila.fin)
    let inicioNuevo = fila.inicio
    let finNuevo = fila.fin
    function alMover(puntero: globalThis.PointerEvent) {
      const dias = Math.round(((puntero.clientX - origen) / ancho) * span)
      const delta = dias * 86_400_000
      if (modo === "mover") { inicioNuevo = isoDe(baseInicio + delta); finNuevo = isoDe(baseFin + delta) }
      if (modo === "inicio") inicioNuevo = isoDe(Math.min(baseInicio + delta, baseFin))
      if (modo === "fin") finNuevo = isoDe(Math.max(baseFin + delta, baseInicio))
    }
    function soltar() {
      window.removeEventListener("pointermove", alMover)
      if (inicioNuevo !== fila.inicio || finNuevo !== fila.fin) onCambio(inicioNuevo, finNuevo)
    }
    window.addEventListener("pointermove", alMover)
    window.addEventListener("pointerup", soltar, { once: true })
  }
  return (
    <span className="relative block h-6 w-36 rounded bg-[#E7F0FB]">
      <span className="absolute top-1 h-4 rounded bg-[#1658B0]" style={{ left: `${left}%`, width: `${width}%` }} onPointerDown={(event) => mover(event, "mover")} />
      <span className="absolute top-0 h-6 w-2 cursor-ew-resize" style={{ left: `calc(${left}% - 4px)` }} onPointerDown={(event) => mover(event, "inicio")} />
      <span className="absolute top-0 h-6 w-2 cursor-ew-resize" style={{ left: `calc(${left + width}% - 4px)` }} onPointerDown={(event) => mover(event, "fin")} />
    </span>
  )
}

function AltaRapida({ nombre, onCrear }: { nombre: string; onCrear: (titulo: string) => Promise<void> }) {
  const [titulo, setTitulo] = useState("")
  const [ocupada, setOcupada] = useState(false)
  const [avisoCorto, setAvisoCorto] = useState("")
  return (
    <span className="flex flex-wrap items-center gap-2">
      <input value={titulo} disabled={ocupada} aria-label={`Agregar actividad en ${nombre}`} placeholder="+ Escriba y pulse Enter" onChange={(event) => { setTitulo(event.target.value); setAvisoCorto("") }} onKeyDown={(event) => {
        if (event.key !== "Enter") return
        const texto = titulo.trim()
        if (texto.length < 3) {
          setAvisoCorto("Escriba al menos 3 caracteres.")
          toast.error("Escriba al menos 3 caracteres.")
          return
        }
        setAvisoCorto("")
        setOcupada(true)
        void onCrear(texto).finally(() => { setTitulo(""); setOcupada(false) })
      }} className="h-9 w-72 rounded-md border border-dashed border-[#1658B0] px-2 text-sm" />
      {avisoCorto ? <span role="alert" className="text-xs font-medium text-red-700">{avisoCorto}</span> : null}
    </span>
  )
}

function BarraMasiva({ cantidad, catalogo, responsables, onAplicar, onCerrar }: {
  cantidad: number
  catalogo: ProyectoPlan[]
  responsables: Persona[]
  onAplicar: (patch: { assigneeId?: string | null; status?: string; fechaInicio?: string | null; fechaFin?: string | null; projectId?: string }) => Promise<void>
  onCerrar: () => void
}) {
  const [responsable, setResponsable] = useState("")
  const [estado, setEstado] = useState("")
  const [inicio, setInicio] = useState("")
  const [fin, setFin] = useState("")
  const [proyecto, setProyecto] = useState("")
  return (
    <form className="sticky bottom-3 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white p-3 shadow-lg" onSubmit={(event) => {
      event.preventDefault()
      const patch: { assigneeId?: string | null; status?: string; fechaInicio?: string | null; fechaFin?: string | null; projectId?: string } = {}
      if (responsable) patch.assigneeId = responsable === "ninguno" ? null : responsable
      if (estado) patch.status = estado
      if (inicio) patch.fechaInicio = inicio
      if (fin) patch.fechaFin = fin
      if (proyecto) patch.projectId = proyecto
      void onAplicar(patch)
    }}>
      <span className="text-sm font-medium">{cantidad} seleccionadas</span>
      <select aria-label="Responsable del lote" value={responsable} onChange={(event) => setResponsable(event.target.value)} className="h-9 rounded-md border border-[#E4E7EC] px-2 text-sm"><option value="">Responsable</option><option value="ninguno">Sin asignar</option>{responsables.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select>
      <select aria-label="Estado del lote" value={estado} onChange={(event) => setEstado(event.target.value)} className="h-9 rounded-md border border-[#E4E7EC] px-2 text-sm"><option value="">Estado</option>{Object.entries(ESTADO_TAREA_LABEL).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select>
      <input type="date" lang="es-CO" aria-label="Inicio del lote" value={inicio} onChange={(event) => setInicio(event.target.value)} className="h-9 w-40 rounded-md border border-[#E4E7EC] px-2 text-sm" />
      <input type="date" lang="es-CO" aria-label="Fin del lote" value={fin} onChange={(event) => setFin(event.target.value)} className="h-9 w-40 rounded-md border border-[#E4E7EC] px-2 text-sm" />
      <select aria-label="Proyecto del lote" value={proyecto} onChange={(event) => setProyecto(event.target.value)} className="h-9 max-w-52 rounded-md border border-[#E4E7EC] px-2 text-sm"><option value="">Proyecto</option>{catalogo.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button type="submit" className="h-9 rounded-md bg-[#1658B0] px-3 text-sm text-white">Aplicar</button>
      <button type="button" onClick={onCerrar} className="h-9 rounded-md border border-[#E4E7EC] px-3 text-sm">Cerrar</button>
    </form>
  )
}
