"use client"

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import Link from "next/link"
import { CalendarIcon, GripVerticalIcon, MoveHorizontalIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/iconos-planer"
import { CUMPLIMIENTO_LABEL, cumplimientoFecha, porcentajeEntregable, porcentajeProyecto } from "@/lib/entregables"
import { ESTADO_TAREA_LABEL, estadosEditables, type FilaPlan } from "@/lib/plan-trabajo"
import { asignarEntregableAction, crearActividadAction, crearEntregableAction, guardarCeldaAction, renombrarEntregableAction, vincularKpiAction } from "@/server/plan-actions"

type ProyectoPlan = { id: string; name: string; team: string | null; area: string; inicio: string; fin: string }
type EntregableVista = { id: string; proyectoId: string; nombre: string; fecha: string | null; orden: number }

const COLOR: Record<string, string> = {
  a_tiempo: "text-[#1658B0]",
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

  async function crear(proyectoId: string, entregableId: string | null, titulo: string, campo: HTMLInputElement) {
    const proyecto = proyectos.find((item) => item.id === proyectoId)
    if (!proyecto) return
    const temp = `tmp-${Date.now()}`
    const fila: FilaPlan = {
      id: temp, proyectoId, proyecto: proyecto.name, area: proyecto.area, team: proyecto.team,
      actividad: titulo, responsableId: null, responsable: "Sin asignar", participantes: [],
      estado: "PENDIENTE", bloqueo: "", notaRol: "", inicio: null, fin: null,
      inicioProyecto: proyecto.inicio, finProyecto: proyecto.fin,
      horasEstimadas: null, horasReales: null, kpiNombre: "", kpiMeta: null, kpiUnidad: "", kpiActual: null,
      entregableId, parentId: null, orden: 9999, puedeEditar: true, puedeRegistrar: false,
    }
    setLocal((lista) => [...lista, fila])
    campo.value = ""
    campo.focus()
    const data = new FormData()
    data.set("proyectoId", proyectoId)
    data.set("titulo", titulo)
    if (entregableId) data.set("entregableId", entregableId)
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
        const suyas = local.filter((fila) => fila.proyectoId === proyecto.id && !fila.parentId)
        const grupos = listaEntregables.filter((item) => item.proyectoId === proyecto.id)
        const pct = porcentajeProyecto(suyas.map((fila) => ({ hecha: fila.estado === "HECHA" })))
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
              <BloqueEntregable key={entregable.id} entregable={entregable} filas={suyas.filter((fila) => fila.entregableId === entregable.id)} proyecto={proyecto} altas={altas} onCrear={crear} onCambio={setLocal} onRenombrar={setListaEntregables} />
            ))}
            <BloqueEntregable entregable={null} filas={suyas.filter((fila) => !fila.entregableId)} proyecto={proyecto} altas={altas} onCrear={crear} onCambio={setLocal} onRenombrar={setListaEntregables} />
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
  entregable, filas, proyecto, altas, onCrear, onCambio, onRenombrar,
}: {
  entregable: EntregableVista | null
  filas: FilaPlan[]
  proyecto: ProyectoPlan
  altas: MutableRefObject<Record<string, HTMLInputElement | null>>
  onCrear: (proyectoId: string, entregableId: string | null, titulo: string, campo: HTMLInputElement) => Promise<void>
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
      {filas.map((fila) => <Fila key={fila.id} fila={fila} onCambio={onCambio} />)}
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
            void onCrear(proyecto.id, entregable?.id || null, texto, campo)
          }}
        />
      </div>
    </div>
  )
}

function Fila({ fila, onCambio }: { fila: FilaPlan; onCambio: Dispatch<SetStateAction<FilaPlan[]>> }) {
  const [menu, setMenu] = useState(false)
  const [fecha, setFecha] = useState<"inicio" | "fin" | null>(null)
  const [kpi, setKpi] = useState(false)
  const [titulo, setTitulo] = useState(false)
  const vinculado = fila.kpisDisponibles?.find((item) => item.id === fila.kpiId)
  const textoKpi = vinculado?.nombre || fila.kpiNombre || (fila.kpisDisponibles?.[0]?.nombre ? `${fila.kpisDisponibles[0].nombre}${fila.kpisDisponibles.length > 1 ? ` +${fila.kpisDisponibles.length - 1}` : ""}` : "Sin KPI")
  const inicioEstado = cumplimientoFecha(fila.inicio || fila.inicioProyecto, fila.estado === "HECHA" ? 100 : 0, hoyIso())
  const finEstado = cumplimientoFecha(fila.fin || fila.finProyecto, fila.estado === "HECHA" ? 100 : 0, hoyIso())
  async function guardar(patch: Partial<FilaPlan>, envio: Parameters<typeof guardarCeldaAction>[0]) {
    onCambio((lista) => lista.map((item) => (item.id === fila.id ? { ...item, ...patch } : item)))
    const resultado = await guardarCeldaAction(envio)
    if (!resultado.ok) { toast.error(resultado.error); onCambio((lista) => lista.map((item) => (item.id === fila.id ? fila : item))) }
  }
  return (
    <div className="grid items-center gap-1 border-t border-[#F0F2F5] px-2 py-1 text-sm" style={{ gridTemplateColumns: "22px minmax(0,1fr) 28px 64px 22px 22px 22px 40px 92px 78px" }} draggable onDragStart={(event) => event.dataTransfer.setData("text/actividad", fila.id)}>
      <button type="button" className="cursor-grab text-[#98A2B3]" aria-label={`Arrastrar ${fila.actividad}`}><GripVerticalIcon className="size-3.5" /></button>
      {titulo ? (
        <input autoFocus aria-label="Título" defaultValue={fila.actividad} className="h-7 min-w-0 rounded border border-[#1658B0] px-1" onBlur={(event) => { setTitulo(false); const valor = event.target.value.trim(); if (valor.length >= 3 && valor !== fila.actividad) void guardar({ actividad: valor }, { id: fila.id, title: valor }) }} />
      ) : (
        <button type="button" className="truncate text-left" title={fila.actividad} onClick={() => fila.puedeEditar && setTitulo(true)}>{fila.actividad}</button>
      )}
      <span title={fila.responsable}><Avatar nombre={fila.responsableId ? fila.responsable : "?"} /></span>
      <button type="button" className="truncate rounded-full bg-[#E7F0FB] px-1.5 py-0.5 text-[11px] font-medium text-[#1658B0]" title={ESTADO_TAREA_LABEL[fila.estado]} onClick={() => {
        const opciones = estadosEditables(fila.estado)
        const siguiente = opciones[1] || opciones[0]
        if (siguiente) void guardar({ estado: siguiente }, { id: fila.id, status: siguiente })
      }}>{ESTADO_TAREA_LABEL[fila.estado]}</button>
      <span title={fila.bloqueo || "Sin bloqueo"} className={fila.bloqueo ? "text-red-700" : "text-[#98A2B3]"}>●</span>
      <span className="group relative">
        <button type="button" className={COLOR[inicioEstado]} title={`Inicio ${fechaCorta(fila.inicio || fila.inicioProyecto)}`} aria-label="Inicio" onClick={() => setFecha(fecha === "inicio" ? null : "inicio")}><CalendarIcon className="size-3.5" /></button>
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#15122A] px-2 py-1 text-[10px] text-white group-hover:block">Inicio {fechaCorta(fila.inicio || fila.inicioProyecto)}</span>
        {fecha === "inicio" ? <input autoFocus type="date" lang="es-CO" aria-label="Elegir inicio" defaultValue={fila.inicio ?? ""} className="absolute z-20 mt-1 h-8 w-36 rounded border border-[#1658B0] bg-white px-1" onBlur={(event) => { setFecha(null); void guardar({ inicio: event.target.value || null }, { id: fila.id, fechaInicio: event.target.value || null }) }} /> : null}
      </span>
      <span className="relative">
        <button type="button" className={COLOR[finEstado]} title={`Fin ${fechaCorta(fila.fin || fila.finProyecto)}`} aria-label="Fin" onClick={() => setFecha(fecha === "fin" ? null : "fin")}><CalendarIcon className="size-3.5" /></button>
        {fecha === "fin" ? <input autoFocus type="date" lang="es-CO" aria-label="Elegir fin" defaultValue={fila.fin ?? ""} className="absolute right-0 z-20 mt-1 h-8 w-36 rounded border border-[#1658B0] bg-white px-1" onBlur={(event) => { setFecha(null); void guardar({ fin: event.target.value || null }, { id: fila.id, fechaFin: event.target.value || null }) }} /> : null}
      </span>
      <span className="text-[11px] tabular-nums text-[#3d4a63]" title="Horas estimadas / reales">{fila.horasEstimadas ?? "–"}/{fila.horasReales ?? "–"}</span>
      <span className="relative min-w-0">
        <button type="button" className="block w-full truncate text-left text-[11px] text-[#1658B0]" title={textoKpi} onClick={() => setKpi((valor) => !valor)}>{textoKpi}</button>
        {kpi ? (
          <select autoFocus aria-label="Elegir KPI" className="absolute right-0 z-20 mt-1 w-44 rounded border border-[#1658B0] bg-white p-1 text-xs" defaultValue={fila.kpiId ?? ""} onChange={(event) => { setKpi(false); const kpiId = event.target.value || null; onCambio((lista) => lista.map((item) => item.id === fila.id ? { ...item, kpiId } : item)); void vincularKpiAction({ id: fila.id, kpiId }).then((resultado) => { if (!resultado.ok) toast.error(resultado.error) }) }} onBlur={() => setKpi(false)}>
            <option value="">Sin KPI</option>
            {(fila.kpisDisponibles ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.actual ?? "—"}/{item.meta ?? "—"} {item.unidad}</option>)}
          </select>
        ) : null}
      </span>
      <span className="relative">
        <button type="button" aria-expanded={menu} aria-haspopup="menu" className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-1.5 text-[11px] font-medium text-[#1658B0]" onClick={() => setMenu((valor) => !valor)}>
          <MoveHorizontalIcon className="size-3.5" /> Mover
        </button>
        {menu ? <span role="menu" className="absolute right-0 z-20 mt-1 grid w-36 rounded-md border border-[#E4E7EC] bg-white p-1 text-xs shadow"><span className="px-2 py-1 text-[#98A2B3]">Arrastre la fila a otro entregable.</span></span> : null}
      </span>
    </div>
  )
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
