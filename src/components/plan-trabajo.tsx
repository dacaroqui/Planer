"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/iconos-planer"
import { EstadoVacio } from "@/components/estado-vacio"
import {
  ESTADO_TAREA_LABEL,
  avanceKpi,
  estadosEditables,
  filtrarPlan,
  sumarHoras,
  textoKpi,
  type EstadoTareaPlan,
  type FilaPlan,
} from "@/lib/plan-trabajo"
import { crearActividadAction, crearProyectoPlanAction, editarPlanAction } from "@/server/plan-actions"

const PILLS: Record<EstadoTareaPlan, string> = {
  PENDIENTE: "bg-[#F3F4F6] text-[#3d4a63]",
  EN_CURSO: "bg-[#E7F0FB] text-[#1658B0]",
  HECHA: "bg-emerald-100 text-emerald-800",
}

type ProyectoPlan = { id: string; name: string; team: string | null; area: string; inicio: string; fin: string }

export function PlanTrabajo({
  filas,
  proyectos,
  responsables,
  esAdmin,
  empresaId,
  equipos,
}: {
  filas: FilaPlan[]
  proyectos: ProyectoPlan[]
  responsables: { id: string; name: string; teams: string[] }[]
  esAdmin: boolean
  empresaId: string
  equipos: { value: string; label: string }[]
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [area, setArea] = useState("")
  const [persona, setPersona] = useState("")
  const [estado, setEstado] = useState("")
  const [proyecto, setProyecto] = useState("")
  const [sinAsignar, setSinAsignar] = useState(false)
  const [bloqueadas, setBloqueadas] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [agregar, setAgregar] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const areasMenu = [...new Map(proyectos.filter((item) => item.team).map((item) => [item.team, item.area])).entries()].map(([team, etiqueta]) => ({ team: String(team), area: etiqueta }))
  const visibles = useMemo(
    () => filtrarPlan(filas, { q, area, persona, estado, proyecto, sinAsignar, bloqueadas }),
    [filas, q, area, persona, estado, proyecto, sinAsignar, bloqueadas],
  )
  const resumen = resumenDe(visibles)
  const horas = sumarHoras(visibles)
  const grupos = armarGrupos(proyectos, visibles, { q, persona, estado, area, proyecto, sinAsignar, bloqueadas })
  const exportar = `/api/plan/exportar?${new URLSearchParams({
    q, area, persona, estado, proyecto,
    ...(sinAsignar ? { sinAsignar: "1" } : {}),
    ...(bloqueadas ? { bloqueadas: "1" } : {}),
  }).toString()}`
  const personas = [...new Set(filas.flatMap((fila) => [fila.responsable, ...fila.participantes]).filter((nombre) => nombre && nombre !== "Sin asignar"))].sort()

  if (proyectos.length === 0) {
    return (
      <div className="space-y-4">
        {esAdmin ? <button type="button" className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white" onClick={() => setNuevo(true)}><PlusIcon className="size-4" /> Nuevo proyecto</button> : null}
        {nuevo ? <ProyectoNuevo empresaId={empresaId} equipos={equipos} onClose={() => setNuevo(false)} /> : null}
        <EstadoVacio titulo="Todavía no hay proyectos" texto="Cuando exista un proyecto visible para usted, su plan de trabajo aparecerá en esta hoja." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {resumen.map((item) => (
          <span key={item.estado} className={`rounded-full px-3 py-1 text-sm font-medium ${PILLS[item.estado]}`}>{ESTADO_TAREA_LABEL[item.estado]} {item.total}</span>
        ))}
        <span className="text-sm text-muted-foreground">{visibles.length} {visibles.length === 1 ? "actividad" : "actividades"}</span>
        <span className="text-sm text-muted-foreground">Horas est. {horas.estimadas} · Horas reales {horas.reales}</span>
        <button type="button" className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white" onClick={() => setAgregar("global")}><PlusIcon className="size-4" /> Agregar actividad</button>
        {esAdmin ? <button type="button" className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#1658B0] px-3 text-sm font-medium text-[#1658B0]" onClick={() => setNuevo(true)}><PlusIcon className="size-4" /> Nuevo proyecto</button> : null}
        <a href={exportar} className="ml-auto inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm font-medium text-[#1658B0]">Exportar .xlsx</a>
      </div>
      {agregar === "global" ? <FormularioActividad proyectos={proyectos} responsables={responsables} onClose={() => setAgregar(null)} /> : null}
      {nuevo ? <ProyectoNuevo empresaId={empresaId} equipos={equipos} onClose={() => setNuevo(false)} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <SearchIcon className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
          <input value={q} onChange={(event) => setQ(event.target.value)} aria-label="Buscar en el plan" placeholder="Buscar actividad, persona o bloqueo" className="h-10 w-64 rounded-lg border border-[#E4E7EC] bg-white pr-3 pl-9 text-sm" />
        </label>
        <select aria-label="Área" value={area} onChange={(event) => setArea(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Área</option>
          {areasMenu.map((item) => <option key={item.team} value={item.team}>{item.area}</option>)}
        </select>
        <select aria-label="Persona" value={persona} onChange={(event) => setPersona(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Persona</option>
          {personas.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
        </select>
        <select aria-label="Estado" value={estado} onChange={(event) => setEstado(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Estado</option>
          {ESTADO_TAREA_LABEL && Object.entries(ESTADO_TAREA_LABEL).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
        <select aria-label="Proyecto" value={proyecto} onChange={(event) => setProyecto(event.target.value)} className="h-10 max-w-56 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Proyecto</option>
          {proyectos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sinAsignar} onChange={(event) => setSinAsignar(event.target.checked)} /> Solo sin asignar</label>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={bloqueadas} onChange={(event) => setBloqueadas(event.target.checked)} /> Solo bloqueadas</label>
      </div>
      {grupos.length === 0 ? (
        <EstadoVacio compacto titulo="Ninguna actividad coincide" texto="Quite un filtro o busque con otras palabras." />
      ) : (
        <div className="max-h-[calc(100vh-16rem)] overflow-auto rounded-xl border border-[#E4E7EC] bg-white">
          <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#F8FAFD] text-xs text-muted-foreground">
              <tr>
                {["Proyecto", "Área", "Actividad", "Responsable", "Participantes", "Estado", "Bloqueo", "Inicio", "Fin", "Horas est.", "Horas reales", "KPI", ""].map((columna) => (
                  <th key={columna || "acciones"} className="border-b border-[#E4E7EC] px-3 py-2 font-medium whitespace-nowrap">{columna}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => {
                const total = sumarHoras(grupo.filas)
                const span = Math.max(grupo.filas.length, 1) + 2
                return (
                  <Fragment key={grupo.proyecto.id}>
                    {grupo.filas.length === 0 ? (
                      <tr key={`${grupo.proyecto.id}-vacio`}>
                        <td rowSpan={span} className="border-r border-b border-[#E4E7EC] bg-[#F4F8FE] px-3 py-3 font-medium"><Link href={`/proyectos/${grupo.proyecto.id}`} className="text-[#1658B0] hover:underline">{grupo.proyecto.name}</Link></td>
                        <td rowSpan={span} className="border-r border-b border-[#E4E7EC] px-3 py-3 text-[#3d4a63]">{grupo.proyecto.area}</td>
                        <td colSpan={11} className="border-b border-[#F0F2F5] px-3 py-2 text-muted-foreground">Sin actividades todavía.</td>
                      </tr>
                    ) : grupo.filas.map((fila, indice) => (
                      <tr key={fila.id} className="align-top">
                        {indice === 0 ? <td rowSpan={span} className="border-r border-b border-[#E4E7EC] bg-[#F4F8FE] px-3 py-3 font-medium"><Link href={`/proyectos/${fila.proyectoId}`} className="text-[#1658B0] hover:underline">{fila.proyecto}</Link></td> : null}
                        {indice === 0 ? <td rowSpan={span} className="border-r border-b border-[#E4E7EC] px-3 py-3 text-[#3d4a63]">{fila.area}</td> : null}
                        <td className="border-b border-[#F0F2F5] px-3 py-2">
                          <Link href={`/proyectos/${fila.proyectoId}#tarea-${fila.id}`} className="font-medium text-[#1658B0] hover:underline">{fila.actividad}</Link>
                          {editId === fila.id ? <Editor fila={fila} responsables={responsables.filter((persona) => !fila.team || persona.teams.includes(fila.team))} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); router.refresh() }} /> : null}
                        </td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2">{fila.responsableId ? <span className="inline-flex items-center gap-2"><Avatar nombre={fila.responsable} />{fila.responsable}</span> : <span className="inline-flex whitespace-nowrap rounded-full bg-[#FEF3C7] px-2 py-0.5 font-medium text-[#92400E]">Sin asignar</span>}</td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2 text-[#3d4a63]">{fila.participantes.join(", ") || "—"}</td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILLS[fila.estado]}`}>{ESTADO_TAREA_LABEL[fila.estado]}</span></td>
                        <td className={`border-b border-[#F0F2F5] px-3 py-2 ${fila.bloqueo ? "font-medium text-red-700" : "text-muted-foreground"}`}>{fila.bloqueo || "—"}</td>
                        <td className={`border-b border-[#F0F2F5] px-3 py-2 whitespace-nowrap ${fila.inicio ? "" : "text-[#98A2B3]"}`}>{fila.inicio || fila.inicioProyecto || "—"}</td>
                        <td className={`border-b border-[#F0F2F5] px-3 py-2 whitespace-nowrap ${fila.fin ? "" : "text-[#98A2B3]"}`}>{fila.fin || fila.finProyecto || "—"}</td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2 tabular-nums">{fila.horasEstimadas ?? "—"}</td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2 tabular-nums">{fila.horasReales ?? "—"}</td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2"><Kpi fila={fila} /></td>
                        <td className="border-b border-[#F0F2F5] px-3 py-2 whitespace-nowrap">
                          {fila.puedeEditar ? <button type="button" className="text-sm font-medium text-[#1658B0]" onClick={() => setEditId(fila.id)}>Editar</button> : null}
                          {fila.puedeRegistrar ? <button type="button" className="text-sm font-medium text-[#1658B0]" onClick={() => setEditId(fila.id)}>Registrar</button> : null}
                        </td>
                      </tr>
                    ))}
                    <tr key={`${grupo.proyecto.id}-total`} className="bg-[#F8FAFD] text-xs font-medium text-[#3d4a63]">
                      <td colSpan={7} className="border-b border-[#E4E7EC] px-3 py-2">Total {grupo.proyecto.name}</td>
                      <td className="border-b border-[#E4E7EC] px-3 py-2 tabular-nums">{total.estimadas}</td>
                      <td className="border-b border-[#E4E7EC] px-3 py-2 tabular-nums">{total.reales}</td>
                      <td className="border-b border-[#E4E7EC] px-3 py-2" colSpan={2} />
                    </tr>
                    <tr key={`${grupo.proyecto.id}-agregar`}>
                      <td colSpan={11} className="border-b border-[#E4E7EC] px-3 py-2">
                        {agregar === grupo.proyecto.id ? (
                          <FormularioActividad proyectos={proyectos} proyectoId={grupo.proyecto.id} responsables={responsables} onClose={() => setAgregar(null)} />
                        ) : (
                          <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-[#1658B0]" onClick={() => setAgregar(grupo.proyecto.id)}><PlusIcon className="size-3.5" /> Agregar actividad</button>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function resumenDe(filas: FilaPlan[]) {
  return (["PENDIENTE", "EN_CURSO", "HECHA"] as EstadoTareaPlan[]).map((estado) => ({
    estado,
    total: filas.filter((fila) => fila.estado === estado).length,
  }))
}

function armarGrupos(proyectos: ProyectoPlan[], visibles: FilaPlan[], filtros: { q?: string; persona?: string; estado?: string; area?: string; proyecto?: string; sinAsignar?: boolean; bloqueadas?: boolean }) {
  const estrecho = Boolean(filtros.q || filtros.persona || filtros.estado || filtros.sinAsignar || filtros.bloqueadas)
  return proyectos.filter((item) => {
    if (filtros.area && item.team !== filtros.area) return false
    if (filtros.proyecto && item.id !== filtros.proyecto) return false
    const propias = visibles.some((fila) => fila.proyectoId === item.id)
    return propias || !estrecho
  }).map((item) => ({ proyecto: item, filas: visibles.filter((fila) => fila.proyectoId === item.id) }))
}

function Kpi({ fila }: { fila: FilaPlan }) {
  const texto = textoKpi(fila)
  if (!texto) return <span className="text-muted-foreground">—</span>
  const avance = avanceKpi(fila.kpiActual, fila.kpiMeta)
  return (
    <div className="min-w-28">
      {fila.kpiNombre ? <p className="text-xs text-[#3d4a63]">{fila.kpiNombre}</p> : null}
      <p className="text-xs">{texto}</p>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#E7F0FB]" aria-label={`Avance del KPI ${avance}%`}><span className="block h-full bg-[#1658B0]" style={{ width: `${avance}%` }} /></span>
    </div>
  )
}

function FormularioActividad({
  proyectos,
  proyectoId,
  responsables,
  onClose,
}: {
  proyectos: ProyectoPlan[]
  proyectoId?: string
  responsables: { id: string; name: string; teams: string[] }[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [proyecto, setProyecto] = useState(proyectoId || proyectos[0]?.id || "")
  const equipo = proyectos.find((item) => item.id === proyecto)?.team
  const gente = responsables.filter((persona) => !equipo || persona.teams.includes(equipo))
  return (
    <form className="grid gap-2 rounded-lg border border-[#E7F0FB] bg-[#F8FAFD] p-3 md:grid-cols-4" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("proyectoId", proyecto)
      start(async () => {
        const resultado = await crearActividadAction(data)
        if (!resultado.ok) { toast.error(resultado.error); return }
        toast.success(resultado.message)
        onClose()
        router.refresh()
      })
    }}>
      {!proyectoId ? (
        <label className="grid gap-1 text-xs md:col-span-2">Proyecto
          <select aria-label="Proyecto de la actividad" value={proyecto} onChange={(event) => setProyecto(event.target.value)} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm">
            {proyectos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      ) : null}
      <label className="grid gap-1 text-xs md:col-span-2">Actividad
        <input name="titulo" required minLength={3} aria-label="Título de la actividad" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Responsable
        <select name="assigneeId" aria-label="Responsable de la actividad" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm">
          <option value="">Sin asignar</option>
          {gente.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs">Participantes
        <input name="participantes" aria-label="Participantes" placeholder="David, Edwin" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Inicio
        <input name="fechaInicio" type="date" aria-label="Fecha de inicio" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Fin
        <input name="fechaFin" type="date" aria-label="Fecha de fin" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Horas estimadas
        <input name="horasEstimadas" inputMode="decimal" aria-label="Horas estimadas" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">KPI
        <input name="kpiNombre" aria-label="Nombre del KPI" placeholder="Piezas publicadas" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Meta
        <input name="kpiMeta" inputMode="decimal" aria-label="Meta del KPI" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Unidad
        <input name="kpiUnidad" aria-label="Unidad del KPI" placeholder="%, videos, leads" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Actual
        <input name="kpiActual" inputMode="decimal" aria-label="Valor actual del KPI" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs md:col-span-2">Bloqueo
        <input name="bloqueo" aria-label="Bloqueo" className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" disabled={pending} className="h-9 rounded-md bg-[#1658B0] px-3 text-sm font-medium text-white">Guardar</button>
        <button type="button" onClick={onClose} className="h-9 rounded-md border border-[#E4E7EC] px-3 text-sm">Cerrar</button>
      </div>
    </form>
  )
}

function ProyectoNuevo({ empresaId, equipos, onClose }: { empresaId: string; equipos: { value: string; label: string }[]; onClose: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <form className="grid gap-2 rounded-lg border border-[#E4E7EC] bg-white p-3 md:grid-cols-5" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        const resultado = await crearProyectoPlanAction(data)
        if (!resultado.ok) { toast.error(resultado.error); return }
        toast.success(resultado.message)
        onClose()
        router.refresh()
      })
    }}>
      <input type="hidden" name="empresaId" value={empresaId} />
      <label className="grid gap-1 text-xs md:col-span-2">Nombre
        <input name="name" required minLength={3} aria-label="Nombre del proyecto" className="h-9 rounded-md border border-[#E4E7EC] px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Área
        <select name="team" required aria-label="Área del proyecto" className="h-9 rounded-md border border-[#E4E7EC] px-2 text-sm">
          {equipos.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs">Inicio
        <input name="startsAt" type="date" required aria-label="Inicio del proyecto" className="h-9 rounded-md border border-[#E4E7EC] px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">Fin
        <input name="targetAt" type="date" required aria-label="Fin del proyecto" className="h-9 rounded-md border border-[#E4E7EC] px-2 text-sm" />
      </label>
      <div className="flex items-end gap-2 md:col-span-5">
        <button type="submit" disabled={pending} className="h-9 rounded-md bg-[#1658B0] px-3 text-sm font-medium text-white">Crear proyecto</button>
        <button type="button" onClick={onClose} className="h-9 rounded-md border border-[#E4E7EC] px-3 text-sm">Cerrar</button>
      </div>
    </form>
  )
}

function Editor({ fila, responsables, onClose, onSaved }: { fila: FilaPlan; responsables: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [pending, start] = useTransition()
  const opciones = estadosEditables(fila.estado)
  const avance = fila.puedeRegistrar && !fila.puedeEditar
  return (
    <form className="mt-2 grid gap-2 rounded-lg border border-[#E7F0FB] bg-[#F8FAFD] p-2 md:grid-cols-2" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        const resultado = await editarPlanAction(data)
        if (!resultado.ok) { toast.error(resultado.error); return }
        toast.success(resultado.message)
        onSaved()
      })
    }}>
      <input type="hidden" name="id" value={fila.id} />
      {avance ? <input type="hidden" name="soloAvance" value="1" /> : null}
      {fila.puedeEditar ? (
        <>
          <label className="grid gap-1 text-xs">Responsable
            <select name="assigneeId" aria-label="Responsable de la fila" defaultValue={fila.responsableId ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm">
              <option value="">Sin asignar</option>
              {responsables.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs">Estado
            <select name="status" aria-label="Estado de la fila" defaultValue={fila.estado} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm">
              {opciones.map((estado) => <option key={estado} value={estado}>{ESTADO_TAREA_LABEL[estado]}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs md:col-span-2">Participantes
            <input name="participantes" aria-label="Participantes de la fila" defaultValue={fila.participantes.join(", ")} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">Inicio
            <input name="fechaInicio" type="date" aria-label="Inicio de la fila" defaultValue={fila.inicio ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">Fin
            <input name="fechaFin" type="date" aria-label="Fin de la fila" defaultValue={fila.fin ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">Horas estimadas
            <input name="horasEstimadas" inputMode="decimal" aria-label="Horas estimadas de la fila" defaultValue={fila.horasEstimadas ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs md:col-span-2">Bloqueo
            <input name="bloqueo" aria-label="Bloqueo de la fila" defaultValue={fila.bloqueo} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">KPI
            <input name="kpiNombre" aria-label="Nombre del KPI de la fila" defaultValue={fila.kpiNombre} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">Meta
            <input name="kpiMeta" inputMode="decimal" aria-label="Meta del KPI de la fila" defaultValue={fila.kpiMeta ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">Unidad
            <input name="kpiUnidad" aria-label="Unidad del KPI de la fila" defaultValue={fila.kpiUnidad} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
          </label>
        </>
      ) : null}
      <label className="grid gap-1 text-xs">Horas reales
        <input name="horasReales" inputMode="decimal" aria-label="Horas reales de la fila" defaultValue={fila.horasReales ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs">KPI actual
        <input name="kpiActual" inputMode="decimal" aria-label="Valor actual del KPI de la fila" defaultValue={fila.kpiActual ?? ""} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" disabled={pending} className="h-8 rounded-md bg-[#1658B0] px-3 text-xs font-medium text-white">Guardar</button>
        <button type="button" onClick={onClose} className="h-8 rounded-md border border-[#E4E7EC] px-3 text-xs">Cerrar</button>
      </div>
    </form>
  )
}
