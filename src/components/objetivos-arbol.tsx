"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { toast } from "sonner"
import { EditorLinea } from "@/components/editor-linea"
import { AltaKpi, KpiInline, type KpiLinea } from "@/components/kpi-inline"
import { claseTope } from "@/components/objetivos-ui"
import { MARCA_LABEL, OBJETIVO_LABEL, TEAM_LABEL } from "@/lib/objetivos"
import { asignarProyectoAction, crearKpiObjetivoAction, editarCampoObjetivoAction, moverProyectoObjetivoAction } from "@/server/objetivos-actions"

type Proyecto = { id: string; name: string; fase: string; medio: string; horas: number; costo: number; actividades: { id: string; titulo: string; responsable: string; horas: number }[] }
type Kpi = KpiLinea & { bloqueado: boolean; motivo: string }
type Persona = { id: string; name: string }
type Objetivo = {
  id: string
  marca: string
  titulo: string
  area: string
  dueno: string
  duenoId: string
  periodoInicio: string
  periodoFin: string
  estado: string
  horas: number
  costo: number
  costoTope: number | null
  excede: boolean
  puedeEditar: boolean
  kpis: Kpi[]
  proyectos: Proyecto[]
}
type Fase = { id: string; team: string; nombre: string }
type ProyectoLibre = { id: string; name: string; team: string | null }

export function ArbolObjetivos({ objetivos, fases, proyectos, personas, puedeMeta }: { objetivos: Objetivo[]; fases: Fase[]; proyectos: ProyectoLibre[]; personas: Persona[]; puedeMeta: boolean }) {
  const [arrastre, setArrastre] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const porMarca = new Map<string, Objetivo[]>()
  for (const objetivo of objetivos) {
    const lista = porMarca.get(objetivo.marca) ?? []
    lista.push(objetivo)
    porMarca.set(objetivo.marca, lista)
  }
  async function alSoltar(event: DragEndEvent) {
    setArrastre(null)
    const proyectoId = String(event.active.id).replace(/^proy-/, "")
    const objetivoId = String(event.over?.id || "").replace(/^obj-/, "")
    if (!proyectoId || !objetivoId || !event.over) return
    const origen = objetivos.find((item) => item.proyectos.some((proyecto) => proyecto.id === proyectoId))
    if (origen?.id === objetivoId) return
    const resultado = await moverProyectoObjetivoAction({ proyectoId, objetivoId })
    if (!resultado.ok) toast.error(resultado.error)
    else toast.success("Proyecto movido al objetivo.", { duration: 5000, action: { label: "Deshacer", onClick: () => { if (origen) void moverProyectoObjetivoAction({ proyectoId, objetivoId: origen.id }) } } })
  }
  return (
    <DndContext sensors={sensors} onDragStart={(event) => setArrastre(String(event.active.id))} onDragEnd={(event) => { void alSoltar(event) }} onDragCancel={() => setArrastre(null)}>
      {[...porMarca.entries()].map(([marca, lista]) => (
        <section key={marca} className="rounded-xl border border-[#E4E7EC] bg-white">
          <h2 className="border-b border-[#E4E7EC] px-4 py-3 font-heading text-2xl">{MARCA_LABEL[marca as "CIFES"] || marca}</h2>
          {lista.map((objetivo) => (
            <ObjetivoNodo key={objetivo.id} objetivo={objetivo} fases={fases} proyectos={proyectos} personas={personas} puedeMeta={puedeMeta} arrastrando={Boolean(arrastre)} />
          ))}
        </section>
      ))}
    </DndContext>
  )
}

function fechaCorta(iso: string) {
  const [anio, mes, dia] = iso.split("-")
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : iso || "—"
}

function textoCosto(costo: number, tope: string) {
  const topeTexto = tope.trim()
  if (!topeTexto && !costo) return "Costo —"
  if (!topeTexto) return `Costo ${costo}`
  return `Costo ${costo ? costo : "—"} / tope ${topeTexto}`
}

function ObjetivoNodo({ objetivo, fases, proyectos, personas, puedeMeta, arrastrando }: { objetivo: Objetivo; fases: Fase[]; proyectos: ProyectoLibre[]; personas: Persona[]; puedeMeta: boolean; arrastrando: boolean }) {
  const router = useRouter()
  const { setNodeRef, isOver } = useDroppable({ id: `obj-${objetivo.id}`, disabled: !objetivo.puedeEditar })
  const [titulo, setTitulo] = useState(objetivo.titulo)
  const [duenoId, setDuenoId] = useState(objetivo.duenoId)
  const [inicio, setInicio] = useState(objetivo.periodoInicio)
  const [fin, setFin] = useState(objetivo.periodoFin)
  const [tope, setTope] = useState(objetivo.costoTope == null ? "" : String(objetivo.costoTope))
  const [kpis, setKpis] = useState(objetivo.kpis)
  useEffect(() => { setKpis(objetivo.kpis) }, [objetivo.kpis])
  const dueno = personas.find((persona) => persona.id === duenoId)?.name || objetivo.dueno
  async function guardarCampo(campo: "titulo" | "duenoId" | "periodoInicio" | "periodoFin" | "costoTope", valor: string, aplicar: () => void, revertir: () => void) {
    aplicar()
    const resultado = await editarCampoObjetivoAction({ id: objetivo.id, campo, valor })
    if (!resultado.ok) revertir()
    else router.refresh()
    return resultado
  }
  async function crearKpi(nombre: string) {
    const tempId = `tmp-${Date.now()}`
    const temp: Kpi = { id: tempId, nombre, actual: null, meta: null, unidad: "", estado: "EN_LINEA_BASE", actividades: 0, bloqueado: false, motivo: "" }
    setKpis((lista) => [...lista, temp])
    const resultado = await crearKpiObjetivoAction({ objetivoId: objetivo.id, nombre })
    if (!resultado.ok || !resultado.id) {
      setKpis((lista) => lista.filter((item) => item.id !== tempId))
      return { ok: false as const, error: resultado.ok ? "No se pudo agregar el KPI." : resultado.error }
    }
    setKpis((lista) => lista.map((item) => (item.id === tempId ? { ...item, id: resultado.id! } : item)))
    router.refresh()
    return { ok: true as const }
  }
  return (
    <details open className="border-b border-[#F0F2F5] px-4 py-3">
      <summary className="cursor-pointer font-medium">
        {titulo}
        <span className="ml-2 text-sm text-muted-foreground">{TEAM_LABEL[objetivo.area as "MARKETING"] || objetivo.area} · {dueno} · {OBJETIVO_LABEL[objetivo.estado as "ABIERTO"] || objetivo.estado} · {objetivo.horas} h</span>
        <span className={`ml-2 text-sm ${claseTope(objetivo.excede)}`}>{textoCosto(objetivo.costo, tope)}{objetivo.excede ? " · por encima del tope" : ""}</span>
        <span className="ml-2 text-sm text-muted-foreground">{fechaCorta(inicio)} – {fechaCorta(fin)}</span>
      </summary>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <EditorLinea valor={titulo} etiqueta="Objetivo" puedeEditar={objetivo.puedeEditar} onGuardar={(valor) => guardarCampo("titulo", valor, () => setTitulo(valor), () => setTitulo(titulo))} />
        <EditorLinea valor={duenoId} etiqueta="Dueño" tipo="lista" opciones={personas.map((persona) => ({ value: persona.id, label: persona.name }))} puedeEditar={objetivo.puedeEditar} onGuardar={(valor) => guardarCampo("duenoId", valor, () => setDuenoId(valor), () => setDuenoId(duenoId))} />
        <EditorLinea valor={inicio} etiqueta="Inicio del periodo" tipo="fecha" puedeEditar={objetivo.puedeEditar} onGuardar={(valor) => guardarCampo("periodoInicio", valor, () => setInicio(valor), () => setInicio(inicio))} />
        <EditorLinea valor={fin} etiqueta="Fin del periodo" tipo="fecha" puedeEditar={objetivo.puedeEditar} onGuardar={(valor) => guardarCampo("periodoFin", valor, () => setFin(valor), () => setFin(fin))} />
        <EditorLinea valor={tope} etiqueta="Costo tope" tipo="numero" puedeEditar={objetivo.puedeEditar} onGuardar={(valor) => guardarCampo("costoTope", valor, () => setTope(valor), () => setTope(tope))} />
        <Link href={`/objetivos/${objetivo.id}/editar`} className="mb-1 text-sm text-[#1658B0]">Editar objetivo</Link>
      </div>
      <div className="mt-3 grid gap-2">
        {kpis.map((kpi) => <KpiInline key={kpi.id} kpi={kpi} puedeEditar={objetivo.puedeEditar && !kpi.id.startsWith("tmp-")} puedeMeta={puedeMeta || objetivo.puedeEditar} />)}
        {objetivo.puedeEditar ? <AltaKpi onCrear={crearKpi} /> : null}
      </div>
      <ul ref={setNodeRef} className={`mt-3 grid gap-2 rounded-lg ${isOver || arrastrando ? "bg-[#E7F0FB] p-2" : ""}`}>
        {isOver ? <li className="text-xs text-[#1658B0]">Soltar el proyecto en este objetivo</li> : null}
        {objetivo.proyectos.map((proyecto) => <ProyectoArrastrable key={proyecto.id} proyecto={proyecto} puede={objetivo.puedeEditar} />)}
      </ul>
      {objetivo.puedeEditar ? (
        <form action={asignarProyectoAction} className="mt-3 flex flex-wrap gap-2 text-sm">
          <input type="hidden" name="objetivoId" value={objetivo.id} />
          <select name="proyectoId" aria-label="Proyecto a asignar" className="h-10 rounded-lg border border-[#E4E7EC] px-2">
            {proyectos.filter((item) => item.team === objetivo.area).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="fase" aria-label="Fase del proyecto" className="h-10 rounded-lg border border-[#E4E7EC] px-2">
            <option value="">Fase</option>
            {fases.filter((fase) => fase.team === objetivo.area).map((fase) => <option key={fase.id} value={fase.nombre}>{fase.nombre}</option>)}
          </select>
          <input name="medio" aria-label="Medio" placeholder="Medio" className="h-10 rounded-lg border border-[#E4E7EC] px-2" />
          <input name="costo" aria-label="Costo del proyecto" placeholder="Costo" className="h-10 w-24 rounded-lg border border-[#E4E7EC] px-2" />
          <button className="h-10 rounded-lg bg-[#1658B0] px-3 text-white" type="submit">Asignar</button>
        </form>
      ) : null}
    </details>
  )
}

function ProyectoArrastrable({ proyecto, puede }: { proyecto: Proyecto; puede: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `proy-${proyecto.id}`, disabled: !puede })
  return (
    <li ref={setNodeRef} className={`rounded-lg bg-[#F8FAFD] px-3 py-2 text-sm ${isDragging ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-2">
        {puede ? <button type="button" className="cursor-grab text-xs text-[#1658B0]" aria-label={`Arrastrar ${proyecto.name}`} {...listeners} {...attributes}>Mover</button> : null}
        <Link href={`/proyectos/${proyecto.id}`} className="font-medium text-[#1658B0]">{proyecto.name}</Link>
      </span>
      <span className="text-muted-foreground"> · {proyecto.fase || "Sin fase"} · {proyecto.medio || "Sin medio"} · {proyecto.horas ? `${proyecto.horas} h` : "—"} · {proyecto.costo ? proyecto.costo : "—"}</span>
      <ul className="mt-1 text-xs text-[#3d4a63]">
        {proyecto.actividades.map((actividad) => <li key={actividad.id}>{actividad.titulo} · {actividad.responsable} · {actividad.horas ? `${actividad.horas} h` : "—"}</li>)}
      </ul>
    </li>
  )
}

