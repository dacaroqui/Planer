"use client"

import { useState } from "react"
import Link from "next/link"
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { toast } from "sonner"
import { SelloBloqueo, TextoKpi, claseTope } from "@/components/objetivos-ui"
import { MARCA_LABEL, OBJETIVO_LABEL, TEAM_LABEL } from "@/lib/objetivos"
import { ajustarKpiAction, asignarProyectoAction, moverProyectoObjetivoAction } from "@/server/objetivos-actions"

type Proyecto = { id: string; name: string; fase: string; medio: string; horas: number; costo: number; actividades: { id: string; titulo: string; responsable: string; horas: number }[] }
type Kpi = { id: string; nombre: string; actual: number | null; meta: number | null; unidad: string; bloqueado: boolean; motivo: string }
type Objetivo = {
  id: string
  marca: string
  titulo: string
  area: string
  dueno: string
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

export function ArbolObjetivos({ objetivos, fases, proyectos, puedeMeta }: { objetivos: Objetivo[]; fases: Fase[]; proyectos: ProyectoLibre[]; puedeMeta: boolean }) {
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
            <ObjetivoNodo key={objetivo.id} objetivo={objetivo} fases={fases} proyectos={proyectos} puedeMeta={puedeMeta} arrastrando={Boolean(arrastre)} />
          ))}
        </section>
      ))}
    </DndContext>
  )
}

function ObjetivoNodo({ objetivo, fases, proyectos, puedeMeta, arrastrando }: { objetivo: Objetivo; fases: Fase[]; proyectos: ProyectoLibre[]; puedeMeta: boolean; arrastrando: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `obj-${objetivo.id}`, disabled: !objetivo.puedeEditar })
  return (
    <details open className="border-b border-[#F0F2F5] px-4 py-3">
      <summary className="cursor-pointer font-medium">
        {objetivo.titulo}
        <span className="ml-2 text-sm text-muted-foreground">{TEAM_LABEL[objetivo.area as "MARKETING"] || objetivo.area} · {objetivo.dueno} · {OBJETIVO_LABEL[objetivo.estado as "ABIERTO"] || objetivo.estado} · {objetivo.horas} h</span>
        <span className={`ml-2 text-sm ${claseTope(objetivo.excede)}`}>Costo {objetivo.costo}{objetivo.costoTope != null ? ` / tope ${objetivo.costoTope}` : ""}{objetivo.excede ? " · por encima del tope" : ""}</span>
      </summary>
      <p className="mt-3"><Link href={`/objetivos/${objetivo.id}/editar`} className="text-sm text-[#1658B0]">Editar objetivo</Link></p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {objetivo.kpis.map((kpi) => <KpiEditable key={kpi.id} kpi={kpi} puedeEditar={objetivo.puedeEditar} puedeMeta={puedeMeta} />)}
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
      <span className="text-muted-foreground"> · {proyecto.fase || "Sin fase"} · {proyecto.medio || "Sin medio"} · {proyecto.horas} h · {proyecto.costo}</span>
      <ul className="mt-1 text-xs text-[#3d4a63]">
        {proyecto.actividades.map((actividad) => <li key={actividad.id}>{actividad.titulo} · {actividad.responsable} · {actividad.horas} h</li>)}
      </ul>
    </li>
  )
}

function KpiEditable({ kpi, puedeEditar, puedeMeta }: { kpi: Kpi; puedeEditar: boolean; puedeMeta: boolean }) {
  const [actual, setActual] = useState(kpi.actual == null ? "" : String(kpi.actual))
  const [meta, setMeta] = useState(kpi.meta == null ? "" : String(kpi.meta))
  async function guardar(campo: "actual" | "meta", valor: string) {
    const resultado = await ajustarKpiAction(campo === "actual" ? { id: kpi.id, actual: valor } : { id: kpi.id, meta: valor })
    if (!resultado.ok) toast.error(resultado.error)
    else toast.success("KPI actualizado.", { duration: 5000, action: { label: "Deshacer", onClick: () => { void ajustarKpiAction(campo === "actual" ? { id: kpi.id, actual: kpi.actual == null ? "" : String(kpi.actual) } : { id: kpi.id, meta: kpi.meta == null ? "" : String(kpi.meta) }) } } })
  }
  return (
    <div className="rounded-lg border border-[#E4E7EC] p-3">
      <TextoKpi nombre={kpi.nombre} actual={actual === "" ? null : Number(actual)} meta={meta === "" ? null : Number(meta)} unidad={kpi.unidad} />
      <SelloBloqueo bloqueado={kpi.bloqueado} motivo={kpi.motivo} />
      <div className="mt-2 flex flex-wrap gap-2">
        {puedeEditar ? <label className="grid text-xs">Actual<input value={actual} inputMode="decimal" aria-label={`Actual de ${kpi.nombre}`} onChange={(event) => setActual(event.target.value)} onBlur={() => { if (actual !== (kpi.actual == null ? "" : String(kpi.actual))) void guardar("actual", actual) }} onKeyDown={(event) => { if (event.key === "Enter") void guardar("actual", actual) }} className="h-9 w-24 rounded-lg border border-[#E4E7EC] px-2" /></label> : null}
        {puedeMeta ? <label className="grid text-xs">Meta<input value={meta} inputMode="decimal" aria-label={`Meta de ${kpi.nombre}`} onChange={(event) => setMeta(event.target.value)} onBlur={() => { if (meta !== (kpi.meta == null ? "" : String(kpi.meta))) void guardar("meta", meta) }} onKeyDown={(event) => { if (event.key === "Enter") void guardar("meta", meta) }} className="h-9 w-24 rounded-lg border border-[#E4E7EC] px-2" /></label> : <span className="self-end text-xs text-muted-foreground" title="La meta la aprueba un administrador.">Meta {kpi.meta ?? "—"}</span>}
      </div>
    </div>
  )
}
