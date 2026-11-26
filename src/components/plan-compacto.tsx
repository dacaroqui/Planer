"use client"

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import Link from "next/link"
import { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, GripVerticalIcon, MoveHorizontalIcon, TargetIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/iconos-planer"
import { CUMPLIMIENTO_LABEL, cumplimientoFecha, porcentajeEntregable, porcentajeProyecto } from "@/lib/entregables"
import { ESTADO_TAREA_LABEL, ESTADO_TAREA_PUNTO, ESTADOS_TAREA, alternarHecha, ordenarKpisDisponibles, textoKpi as medidaKpi, type FilaPlan } from "@/lib/plan-trabajo"
import { asignarEntregableAction, crearActividadAction, crearEntregableAction, guardarCeldaAction, moverActividadAction, renombrarEntregableAction, vincularKpiAction } from "@/server/plan-actions"

type ProyectoPlan = { id: string; name: string; team: string | null; area: string; inicio: string; fin: string }
type EntregableVista = { id: string; proyectoId: string; nombre: string; fecha: string | null; orden: number }

const COLOR: Record<string, string> = {
  a_tiempo: "text-[#1658B0]",
  en_riesgo: "text-amber-600",
  vencido: "text-red-700",
  sin_fecha: "text-[#98A2B3]",
}

const COLOR_FIN: Record<string, string> = {
  a_tiempo: "text-emerald-600",
  en_riesgo: "text-amber-600",
  vencido: "text-red-700",
  sin_fecha: "text-[#98A2B3]",
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10)
}

function fechaCorta(iso: string | null) {
  if (!iso) return "Sin fecha"
  const [anio, mes, dia] = iso.split("-")
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : iso
}

function etiquetaKpi(fila: FilaPlan) {
  const vinculado = fila.kpisDisponibles?.find((item) => item.id === fila.kpiId)
  if (vinculado) return medidaKpi({ kpiNombre: vinculado.nombre, kpiActual: vinculado.actual, kpiMeta: vinculado.meta, kpiUnidad: vinculado.unidad })
  if (fila.kpiNombre) return medidaKpi(fila)
  return ""
}

export function PlanCompacto({
  filas,
  proyectos,
  entregables,
  enfocar,
  onDetalles,
}: {
  filas: FilaPlan[]
  proyectos: ProyectoPlan[]
  entregables: EntregableVista[]
  enfocar: string | null
  onDetalles: (proyectoId: string) => void
}) {
  const [local, setLocal] = useState(filas)
  const [listaEntregables, setListaEntregables] = useState(entregables)
  const altas = useRef<Record<string, HTMLInputElement | null>>({})
  useEffect(() => { setLocal(filas) }, [filas])
  useEffect(() => { setListaEntregables(entregables) }, [entregables])
  useEffect(() => {
    if (!enfocar) return
    altas.current[`${enfocar}:sin`]?.focus()
  }, [enfocar])

  async function crear(proyectoId: string, entregableId: string | null, titulo: string, campo: HTMLInputElement, parentId: string | null = null) {
    const proyecto = proyectos.find((item) => item.id === proyectoId)
    if (!proyecto) return
    const padre = parentId ? local.find((item) => item.id === parentId) : null
    const temp = `tmp-${Date.now()}`
    const fila: FilaPlan = {
      id: temp, proyectoId, proyecto: proyecto.name, area: proyecto.area, team: proyecto.team,
      actividad: titulo, responsableId: null, responsable: "Sin asignar", participantes: [],
      estado: "PENDIENTE", bloqueo: "", notaRol: "", inicio: null, fin: null,
      inicioProyecto: proyecto.inicio, finProyecto: proyecto.fin,
      horasEstimadas: null, horasReales: null, kpiNombre: "", kpiMeta: null, kpiUnidad: "", kpiActual: null,
      kpisDisponibles: padre?.kpisDisponibles ?? [],
      entregableId, parentId, orden: 9999, puedeEditar: true, puedeRegistrar: false,
    }
    setLocal((lista) => [...lista, fila])
    campo.value = ""
    campo.focus()
    const data = new FormData()
    data.set("proyectoId", proyectoId)
    data.set("titulo", titulo)
    if (entregableId) data.set("entregableId", entregableId)
    if (parentId) data.set("parentId", parentId)
    const resultado = await crearActividadAction(data)
    if (!resultado.ok) {
      setLocal((lista) => lista.filter((item) => item.id !== temp))
      toast.error(resultado.error)
      campo.focus()
      return
    }
    setLocal((lista) => lista.map((item) => (item.id === temp ? { ...item, id: resultado.id || item.id } : item)))
  }

  return (
    <div className="overflow-x-hidden">
      {proyectos.map((proyecto) => {
        const todas = local.filter((fila) => fila.proyectoId === proyecto.id)
        const raices = todas.filter((fila) => !fila.parentId)
        const grupos = listaEntregables.filter((item) => item.proyectoId === proyecto.id)
        const pct = porcentajeProyecto(raices.map((fila) => ({ hecha: fila.estado === "HECHA" })))
        const estado = cumplimientoFecha(proyecto.fin, pct, hoyIso())
        return (
          <section key={proyecto.id} className="mb-3 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
            <header className="flex items-center gap-3 border-b border-[#E4E7EC] bg-[#F4F8FE] px-3 py-2">
              <div className="min-w-0 flex-1">
                <Link href={`/proyectos/${proyecto.id}`} className="truncate font-medium text-[#1658B0] hover:underline">{proyecto.name}</Link>
                <span className="ml-2 text-xs text-[#3d4a63]">{proyecto.area}</span>
              </div>
              <Barra valor={pct} />
              <span className={`shrink-0 text-xs font-medium ${COLOR[estado]}`}>{pct}% · {CUMPLIMIENTO_LABEL[estado]}</span>
              <button type="button" className="shrink-0 text-xs font-medium text-[#1658B0]" onClick={() => altas.current[`${proyecto.id}:sin`]?.focus()}>+ Agregar actividad</button>
              <button type="button" className="shrink-0 text-xs text-[#3d4a63]" onClick={() => onDetalles(proyecto.id)}>Más detalles</button>
            </header>
            {grupos.map((entregable) => (
              <BloqueEntregable key={entregable.id} entregable={entregable} filas={raices.filter((fila) => fila.entregableId === entregable.id)} todas={todas} proyecto={proyecto} proyectos={proyectos} entregables={grupos} altas={altas} onCrear={crear} onCambio={setLocal} onRenombrar={setListaEntregables} />
            ))}
            <BloqueEntregable entregable={null} filas={raices.filter((fila) => !fila.entregableId)} todas={todas} proyecto={proyecto} proyectos={proyectos} entregables={grupos} altas={altas} onCrear={crear} onCambio={setLocal} onRenombrar={setListaEntregables} />
            <AltaEntregable proyectoId={proyecto.id} onCreado={(item) => setListaEntregables((lista) => [...lista, item])} />
          </section>
        )
      })}
    </div>
  )
}

function Barra({ valor }: { valor: number }) {
  return (
    <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-[#E7F0FB]" aria-label={`Avance ${valor}%`}>
      <span className="block h-full bg-[#1658B0]" style={{ width: `${valor}%` }} />
    </span>
  )
}

function BloqueEntregable({
  entregable, filas, todas, proyecto, proyectos, entregables, altas, onCrear, onCambio, onRenombrar,
}: {
  entregable: EntregableVista | null
  filas: FilaPlan[]
  todas: FilaPlan[]
  proyecto: ProyectoPlan
  proyectos: ProyectoPlan[]
  entregables: EntregableVista[]
  altas: MutableRefObject<Record<string, HTMLInputElement | null>>
  onCrear: (proyectoId: string, entregableId: string | null, titulo: string, campo: HTMLInputElement, parentId?: string | null) => Promise<void>
  onCambio: Dispatch<SetStateAction<FilaPlan[]>>
  onRenombrar: Dispatch<SetStateAction<EntregableVista[]>>
}) {
  const clave = `${proyecto.id}:${entregable?.id || "sin"}`
  const pct = porcentajeEntregable(filas.map((fila) => ({ hecha: fila.estado === "HECHA" })))
  const marca = cumplimientoFecha(entregable?.fecha || proyecto.fin, pct, hoyIso())
  const [nombre, setNombre] = useState(entregable?.nombre || "")
  const [editando, setEditando] = useState(false)
  return (
    <div className="border-b border-[#F0F2F5]" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      const id = event.dataTransfer.getData("text/actividad")
      if (!id) return
      onCambio((lista) => lista.map((fila) => (fila.id === id ? { ...fila, entregableId: entregable?.id || null } : fila)))
      void asignarEntregableAction({ id, entregableId: entregable?.id || null }).then((resultado) => { if (!resultado.ok) toast.error(resultado.error) })
    }}>
      <div className="flex items-center gap-2 bg-[#F8FAFD] px-3 py-1.5">
        {entregable ? (
          editando ? (
            <input autoFocus aria-label="Nombre del entregable" value={nombre} onChange={(event) => setNombre(event.target.value)} onBlur={() => { setEditando(false); void renombrarEntregableAction({ id: entregable.id, nombre }).then((resultado) => { if (!resultado.ok) toast.error(resultado.error); else onRenombrar((lista) => lista.map((item) => item.id === entregable.id ? { ...item, nombre } : item)) }) }} className="h-7 min-w-0 flex-1 rounded border border-[#1658B0] px-2 text-sm" />
          ) : (
            <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-medium" title={entregable.nombre} onClick={() => setEditando(true)}>{entregable.nombre}</button>
          )
        ) : <span className="min-w-0 flex-1 text-sm text-[#98A2B3]">Sin entregable</span>}
        <Barra valor={pct} />
        <span className={`text-xs ${COLOR[marca]}`}>{pct}% · {CUMPLIMIENTO_LABEL[marca]}</span>
        {entregable?.fecha ? <span className={`text-xs ${COLOR[marca]}`} title={fechaCorta(entregable.fecha)}><CalendarIcon className="inline size-3.5" /></span> : null}
      </div>
      {filas.map((fila) => (
        <Fila key={fila.id} fila={fila} hijas={todas.filter((item) => item.parentId === fila.id)} nivel={0} proyecto={proyecto} proyectos={proyectos} entregables={entregables} onCambio={onCambio} onCrear={onCrear} />
      ))}
      <div className="px-3 py-1.5">
        <input
          ref={(nodo) => { altas.current[clave] = nodo }}
          aria-label={`Agregar actividad en ${proyecto.name}`}
          placeholder="Escriba y pulse Enter"
          className="h-8 w-full rounded-md border border-dashed border-[#1658B0] px-2 text-sm"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            const campo = event.currentTarget
            const texto = campo.value.trim()
            if (texto.length < 3) { toast.error("Escriba al menos 3 caracteres."); return }
            void onCrear(proyecto.id, entregable?.id || null, texto, campo, null)
          }}
        />
      </div>
    </div>
  )
}

function Fila({
  fila, hijas, nivel, proyecto, proyectos, entregables, onCambio, onCrear,
}: {
  fila: FilaPlan
  hijas: FilaPlan[]
  nivel: number
  proyecto: ProyectoPlan
  proyectos: ProyectoPlan[]
  entregables: EntregableVista[]
  onCambio: Dispatch<SetStateAction<FilaPlan[]>>
  onCrear: (proyectoId: string, entregableId: string | null, titulo: string, campo: HTMLInputElement, parentId?: string | null) => Promise<void>
}) {
  const [menu, setMenu] = useState<"cerrado" | "entregables" | "proyectos">("cerrado")
  const [fecha, setFecha] = useState<"inicio" | "fin" | null>(null)
  const [kpi, setKpi] = useState(false)
  const [titulo, setTitulo] = useState(false)
  const [estadoAbierto, setEstadoAbierto] = useState(false)
  const estadoRef = useRef<HTMLSpanElement>(null)
  const [abierta, setAbierta] = useState(hijas.length > 0)
  useEffect(() => {
    if (!estadoAbierto) return
    function fuera(event: MouseEvent) {
      if (!estadoRef.current?.contains(event.target as Node)) setEstadoAbierto(false)
    }
    function tecla(event: KeyboardEvent) {
      if (event.key === "Escape") setEstadoAbierto(false)
    }
    document.addEventListener("mousedown", fuera)
    document.addEventListener("keydown", tecla)
    return () => {
      document.removeEventListener("mousedown", fuera)
      document.removeEventListener("keydown", tecla)
    }
  }, [estadoAbierto])
  const texto = etiquetaKpi(fila)
  const grupos = ordenarKpisDisponibles(fila.kpisDisponibles ?? [], proyecto.name)
  const finEstado = cumplimientoFecha(fila.fin, fila.estado === "HECHA" ? 100 : 0, hoyIso())
  async function guardar(patch: Partial<FilaPlan>, envio: Parameters<typeof guardarCeldaAction>[0]) {
    onCambio((lista) => lista.map((item) => (item.id === fila.id ? { ...item, ...patch } : item)))
    const resultado = await guardarCeldaAction(envio)
    if (!resultado.ok) { toast.error(resultado.error); onCambio((lista) => lista.map((item) => (item.id === fila.id ? fila : item))) }
  }
  async function moverEntregable(entregableId: string | null) {
    setMenu("cerrado")
    onCambio((lista) => lista.map((item) => (item.id === fila.id ? { ...item, entregableId } : item)))
    const resultado = await asignarEntregableAction({ id: fila.id, entregableId })
    if (!resultado.ok) { toast.error(resultado.error); onCambio((lista) => lista.map((item) => (item.id === fila.id ? fila : item))) }
  }
  async function moverProyecto(proyectoId: string) {
    const destino = proyectos.find((item) => item.id === proyectoId)
    if (!destino) return
    const previo = fila
    const previas = hijas
    setMenu("cerrado")
    onCambio((lista) => lista.map((item) => {
      if (item.id === fila.id) return { ...item, proyectoId, proyecto: destino.name, area: destino.area, parentId: null, entregableId: null }
      if (item.parentId === fila.id) return { ...item, proyectoId, proyecto: destino.name, area: destino.area, entregableId: null }
      return item
    }))
    const resultado = await moverActividadAction({ id: fila.id, projectId: proyectoId, parentId: null })
    if (!resultado.ok) {
      toast.error(resultado.error)
      onCambio((lista) => lista.map((item) => {
        if (item.id === previo.id) return previo
        return previas.find((hija) => hija.id === item.id) ?? item
      }))
    }
  }
  return (
    <div>
      <div className="grid items-center gap-1 border-t border-[#F0F2F5] px-2 py-1 text-sm" style={{ gridTemplateColumns: "22px minmax(0,1fr) 28px 64px 22px 22px 22px 40px minmax(132px,160px) 78px", paddingLeft: nivel ? 28 : 8 }} draggable onDragStart={(event) => event.dataTransfer.setData("text/actividad", fila.id)}>
        <button type="button" className="cursor-grab text-[#98A2B3]" aria-label={`Arrastrar ${fila.actividad}`}><GripVerticalIcon className="size-3.5" /></button>
        <span className="flex min-w-0 items-center gap-1">
          {nivel === 0 ? (
            <button type="button" aria-expanded={abierta} aria-label={`Subtareas de ${fila.actividad}`} className="text-[#98A2B3]" onClick={() => setAbierta((valor) => !valor)}>
              {abierta ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
            </button>
          ) : <span className="w-3.5" />}
          <button type="button" aria-label={fila.estado === "HECHA" ? `Volver a pendiente ${fila.actividad}` : `Marcar hecha ${fila.actividad}`} aria-pressed={fila.estado === "HECHA"} className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${fila.estado === "HECHA" ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-[#E4E7EC] text-transparent hover:text-[#16A34A]"}`} onClick={() => { const siguiente = alternarHecha(fila.estado); void guardar({ estado: siguiente }, { id: fila.id, status: siguiente }) }}>
            <CheckIcon className="size-3" />
          </button>
          {titulo ? (
            <input autoFocus aria-label="Título" defaultValue={fila.actividad} className="h-7 min-w-0 flex-1 rounded border border-[#1658B0] px-1" onBlur={(event) => { setTitulo(false); const valor = event.target.value.trim(); if (valor.length >= 3 && valor !== fila.actividad) void guardar({ actividad: valor }, { id: fila.id, title: valor }) }} />
          ) : (
            <button type="button" className={`min-w-0 flex-1 truncate text-left ${fila.estado === "HECHA" ? "text-[#98A2B3] line-through" : ""}`} title={fila.actividad} onClick={() => fila.puedeEditar && setTitulo(true)}>{fila.actividad}</button>
          )}
        </span>
        <span title={fila.responsable}><Avatar nombre={fila.responsableId ? fila.responsable : "?"} /></span>
        <span ref={estadoRef} className="relative">
          <button type="button" aria-expanded={estadoAbierto} aria-haspopup="menu" className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium ${fila.estado === "HECHA" ? "bg-emerald-50 text-[#16A34A]" : fila.estado === "EN_CURSO" ? "bg-[#E7F0FB] text-[#1658B0]" : "bg-[#F3F4F6] text-[#3d4a63]"}`} onClick={() => setEstadoAbierto((valor) => !valor)}>{ESTADO_TAREA_LABEL[fila.estado]}</button>
          {estadoAbierto ? (
            <span role="menu" aria-label={`Estado de ${fila.actividad}`} className="absolute left-0 z-30 mt-1 grid w-32 rounded-md border border-[#E4E7EC] bg-white p-1 text-xs shadow" onKeyDown={(event) => { if (event.key === "Escape") setEstadoAbierto(false) }}>
              {ESTADOS_TAREA.map((estado) => (
                <button type="button" role="menuitem" key={estado} className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#E7F0FB]" onClick={() => { setEstadoAbierto(false); if (estado !== fila.estado) void guardar({ estado }, { id: fila.id, status: estado }) }}>
                  <span className={`size-2 rounded-full ${ESTADO_TAREA_PUNTO[estado]}`} />
                  {ESTADO_TAREA_LABEL[estado]}
                </button>
              ))}
            </span>
          ) : null}
        </span>
        <span title={fila.bloqueo || "Sin bloqueo"} className={fila.bloqueo ? "text-red-700" : "text-[#98A2B3]"}>●</span>
        <span className="group relative">
          <button type="button" className="text-[#98A2B3]" aria-label="Inicio" onClick={() => setFecha(fecha === "inicio" ? null : "inicio")}><CalendarIcon className="size-3.5" /></button>
          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#15122A] px-2 py-1 text-[10px] text-white group-hover:block">Inicio {fechaCorta(fila.inicio)}</span>
          {fecha === "inicio" ? <input autoFocus type="date" lang="es-CO" aria-label="Elegir inicio" defaultValue={fila.inicio ?? ""} className="absolute z-20 mt-1 h-8 w-36 rounded border border-[#1658B0] bg-white px-1" onBlur={(event) => { setFecha(null); void guardar({ inicio: event.target.value || null }, { id: fila.id, fechaInicio: event.target.value || null }) }} /> : null}
        </span>
        <span className="group relative">
          <button type="button" className={COLOR_FIN[finEstado]} aria-label="Fin" onClick={() => setFecha(fecha === "fin" ? null : "fin")}><CalendarIcon className="size-3.5" /></button>
          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#15122A] px-2 py-1 text-[10px] text-white group-hover:block">Fin {fechaCorta(fila.fin)}</span>
          {fecha === "fin" ? <input autoFocus type="date" lang="es-CO" aria-label="Elegir fin" defaultValue={fila.fin ?? ""} className="absolute right-0 z-20 mt-1 h-8 w-36 rounded border border-[#1658B0] bg-white px-1" onBlur={(event) => { setFecha(null); void guardar({ fin: event.target.value || null }, { id: fila.id, fechaFin: event.target.value || null }) }} /> : null}
        </span>
        <span className="text-[11px] tabular-nums text-[#3d4a63]" title="Horas estimadas / reales">{fila.horasEstimadas ?? "–"}/{fila.horasReales ?? "–"}</span>
        <span className="relative min-w-0">
          <button type="button" className={`flex w-full items-center gap-1 text-left text-[11px] leading-tight ${texto ? "text-[#1658B0]" : "text-[#98A2B3]"}`} title={texto || "Elegir KPI"} aria-label={texto ? `KPI ${texto}` : "Elegir KPI"} onClick={() => setKpi((valor) => !valor)}>
            {texto ? <span className="min-w-0 whitespace-normal">{texto}</span> : <><TargetIcon className="size-3 shrink-0" /> Elegir KPI</>}
          </button>
          {kpi ? (
            <span role="listbox" aria-label="Elegir KPI" className="absolute right-0 z-30 mt-1 grid max-h-64 w-56 overflow-auto rounded border border-[#1658B0] bg-white p-1 text-xs shadow">
              <button type="button" className="rounded px-2 py-1 text-left text-[#98A2B3] hover:bg-[#E7F0FB]" onClick={() => { setKpi(false); onCambio((lista) => lista.map((item) => item.id === fila.id ? { ...item, kpiId: null } : item)); void vincularKpiAction({ id: fila.id, kpiId: null }).then((resultado) => { if (!resultado.ok) toast.error(resultado.error) }) }}>Sin KPI</button>
              {grupos.delProyecto.length > 0 ? <span className="px-2 pt-1 text-[10px] uppercase tracking-wide text-[#98A2B3]">De este proyecto</span> : null}
              {grupos.delProyecto.map((item) => <OpcionKpi key={item.id} item={item} onElegir={(kpiId) => { setKpi(false); onCambio((lista) => lista.map((filaActual) => filaActual.id === fila.id ? { ...filaActual, kpiId } : filaActual)); void vincularKpiAction({ id: fila.id, kpiId }).then((resultado) => { if (!resultado.ok) toast.error(resultado.error) }) }} />)}
              <span className="px-2 pt-1 text-[10px] uppercase tracking-wide text-[#98A2B3]">Del objetivo y el área</span>
              {grupos.delAmbito.map((item) => <OpcionKpi key={item.id} item={item} onElegir={(kpiId) => { setKpi(false); onCambio((lista) => lista.map((filaActual) => filaActual.id === fila.id ? { ...filaActual, kpiId } : filaActual)); void vincularKpiAction({ id: fila.id, kpiId }).then((resultado) => { if (!resultado.ok) toast.error(resultado.error) }) }} />)}
            </span>
          ) : null}
        </span>
        <span className="relative">
          <button type="button" aria-expanded={menu !== "cerrado"} aria-haspopup="menu" className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-1.5 text-[11px] font-medium text-[#1658B0]" onClick={() => setMenu((valor) => valor === "cerrado" ? "entregables" : "cerrado")}>
            <MoveHorizontalIcon className="size-3.5" /> Mover
          </button>
          {menu === "entregables" ? (
            <span role="menu" className="absolute right-0 z-30 mt-1 grid w-48 rounded-md border border-[#E4E7EC] bg-white p-1 text-xs shadow">
              <button type="button" role="menuitem" className="rounded px-2 py-1 text-left hover:bg-[#E7F0FB]" onClick={() => { void moverEntregable(null) }}>Sin entregable</button>
              {entregables.map((item) => <button type="button" role="menuitem" key={item.id} className="truncate rounded px-2 py-1 text-left hover:bg-[#E7F0FB]" onClick={() => { void moverEntregable(item.id) }}>{item.nombre}</button>)}
              <button type="button" role="menuitem" className="rounded px-2 py-1 text-left font-medium text-[#1658B0] hover:bg-[#E7F0FB]" onClick={() => setMenu("proyectos")}>Otro proyecto…</button>
            </span>
          ) : null}
          {menu === "proyectos" ? (
            <span role="menu" className="absolute right-0 z-30 mt-1 grid max-h-64 w-52 overflow-auto rounded-md border border-[#E4E7EC] bg-white p-1 text-xs shadow">
              {proyectos.filter((item) => item.id !== proyecto.id).map((item) => <button type="button" role="menuitem" key={item.id} className="truncate rounded px-2 py-1 text-left hover:bg-[#E7F0FB]" onClick={() => { void moverProyecto(item.id) }}>{item.name}</button>)}
            </span>
          ) : null}
        </span>
      </div>
      {nivel === 0 && abierta ? (
        <div>
          {hijas.map((hija) => <Fila key={hija.id} fila={hija} hijas={[]} nivel={1} proyecto={proyecto} proyectos={proyectos} entregables={entregables} onCambio={onCambio} onCrear={onCrear} />)}
          <div className="px-3 py-1" style={{ paddingLeft: 36 }}>
            <input
              aria-label={`Subtarea de ${fila.actividad}`}
              placeholder="Subtarea y Enter"
              className="h-7 w-full rounded-md border border-dashed border-[#4FB3DB] px-2 text-xs"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                const campo = event.currentTarget
                const textoSub = campo.value.trim()
                if (textoSub.length < 3) { toast.error("Escriba al menos 3 caracteres."); return }
                void onCrear(proyecto.id, fila.entregableId ?? null, textoSub, campo, fila.id)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function OpcionKpi({ item, onElegir }: { item: { id: string; nombre: string; actual: number | null; meta: number | null; unidad: string }; onElegir: (id: string) => void }) {
  const medida = medidaKpi({ kpiNombre: item.nombre, kpiActual: item.actual, kpiMeta: item.meta, kpiUnidad: item.unidad })
  return <button type="button" role="option" aria-selected={false} className="truncate rounded px-2 py-1 text-left hover:bg-[#E7F0FB]" onClick={() => onElegir(item.id)}>{medida}</button>
}

function AltaEntregable({ proyectoId, onCreado }: { proyectoId: string; onCreado: (item: EntregableVista) => void }) {
  return (
    <input aria-label="Nuevo entregable" placeholder="+ Entregable y Enter" className="h-8 w-full border-0 px-3 text-sm text-[#1658B0]" onKeyDown={(event) => {
      if (event.key !== "Enter") return
      const campo = event.currentTarget
      const nombre = campo.value.trim()
      if (nombre.length < 3) { toast.error("Escriba al menos 3 caracteres."); return }
      campo.value = ""
      void crearEntregableAction({ proyectoId, nombre }).then((resultado) => {
        if (!resultado.ok || !resultado.id) { toast.error(resultado.ok ? "No se pudo crear." : resultado.error); return }
        onCreado({ id: resultado.id, proyectoId, nombre, fecha: null, orden: 999 })
        campo.focus()
      })
    }} />
  )
}
