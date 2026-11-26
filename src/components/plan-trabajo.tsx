"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { EstadoVacio } from "@/components/estado-vacio"
import { PlanCompacto } from "@/components/plan-compacto"
import {
  ESTADO_TAREA_LABEL,
  filtrarPlan,
  sumarHoras,
  type EstadoTareaPlan,
  type FilaPlan,
} from "@/lib/plan-trabajo"
import { crearActividadAction, crearProyectoPlanAction } from "@/server/plan-actions"

type ProyectoPlan = { id: string; name: string; team: string | null; area: string; inicio: string; fin: string }

export function PlanTrabajo({
  filas,
  proyectos,
  responsables,
  esAdmin,
  empresaId,
  equipos,
  entregables = [],
}: {
  filas: FilaPlan[]
  proyectos: ProyectoPlan[]
  responsables: { id: string; name: string; teams: string[] }[]
  esAdmin: boolean
  empresaId: string
  equipos: { value: string; label: string }[]
  entregables?: { id: string; proyectoId: string; nombre: string; fecha: string | null; orden: number }[]
}) {
  const [q, setQ] = useState("")
  const [area, setArea] = useState("")
  const [persona, setPersona] = useState("")
  const [estado, setEstado] = useState("")
  const [proyecto, setProyecto] = useState("")
  const [sinAsignar, setSinAsignar] = useState(false)
  const [bloqueadas, setBloqueadas] = useState(false)
  const [agregar, setAgregar] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [enfocar, setEnfocar] = useState<string | null>(null)
  const [elegir, setElegir] = useState(false)
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl text-[#15122A]">Plan de trabajo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Proyecto, entregable y actividad. Escriba en la fila y pulse Enter.</p>
          <p className="mt-2 text-xs text-muted-foreground">{resumen.map((item) => `${ESTADO_TAREA_LABEL[item.estado]} ${item.total}`).join(" · ")} · {visibles.length} actividades · {horas.estimadas} h est. · {horas.reales} h reales</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportar} className="inline-flex h-9 items-center rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm text-[#1658B0]">Exportar</a>
          {esAdmin ? <button type="button" className="inline-flex h-9 items-center rounded-lg border border-[#1658B0] px-3 text-sm font-medium text-[#1658B0]" onClick={() => setNuevo(true)}>Nuevo proyecto</button> : null}
          <button type="button" className="inline-flex h-9 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white" onClick={() => setElegir((valor) => !valor)}>Agregar actividad</button>
        </div>
      </div>
      {elegir ? (
        <form className="ml-auto flex w-full max-w-xl flex-wrap items-center justify-end gap-2 rounded-lg border border-[#E4E7EC] bg-white p-2" onSubmit={(event) => { event.preventDefault(); const id = String(new FormData(event.currentTarget).get("proyecto") || ""); if (id) { setEnfocar(id); setElegir(false) } }}>
          <select name="proyecto" required aria-label="Proyecto de la actividad" className="h-9 min-w-48 rounded-lg border border-[#E4E7EC] px-2 text-sm"><option value="">Elija un proyecto</option>{proyectos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button type="submit" className="h-9 rounded-lg bg-[#1658B0] px-3 text-sm text-white">Escribir actividad</button>
          {esAdmin ? <button type="button" className="h-9 rounded-lg border border-[#E4E7EC] px-3 text-sm" onClick={() => { setNuevo(true); setElegir(false) }}>Crear proyecto nuevo</button> : null}
        </form>
      ) : null}
      {agregar ? <FormularioActividad proyectos={proyectos} proyectoId={agregar === "global" ? undefined : agregar} responsables={responsables} onClose={() => setAgregar(null)} /> : null}
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
        <PlanCompacto filas={visibles} proyectos={grupos.map((grupo) => grupo.proyecto)} entregables={entregables} enfocar={enfocar} onDetalles={(proyectoId) => setAgregar(proyectoId)} />
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
    <form className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={(event) => {
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
      {proyectoId ? (
        <p className="text-sm text-[#3d4a63] sm:col-span-2">Proyecto: <span className="font-medium text-[#15122A]">{proyectos.find((item) => item.id === proyectoId)?.name}</span></p>
      ) : (
        <label className="grid gap-1 text-xs font-medium text-[#3d4a63] sm:col-span-2">Proyecto
          <select aria-label="Proyecto de la actividad" value={proyecto} onChange={(event) => setProyecto(event.target.value)} className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm">
            {proyectos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63] sm:col-span-2">Actividad
        <input name="titulo" required minLength={3} aria-label="Título de la actividad" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Responsable
        <select name="assigneeId" aria-label="Responsable de la actividad" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm">
          <option value="">Sin asignar</option>
          {gente.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Participantes
        <input name="participantes" aria-label="Participantes" placeholder="Nombres separados por coma" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Inicio
        <input name="fechaInicio" type="date" lang="es-CO" aria-label="Fecha de inicio" className="h-10 w-full min-w-[12rem] rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Fin
        <input name="fechaFin" type="date" lang="es-CO" aria-label="Fecha de fin" className="h-10 w-full min-w-[12rem] rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Horas estimadas
        <input name="horasEstimadas" inputMode="decimal" aria-label="Horas estimadas" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">KPI
        <input name="kpiNombre" aria-label="Nombre del KPI" placeholder="Piezas publicadas" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Meta
        <input name="kpiMeta" inputMode="decimal" aria-label="Meta del KPI" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Unidad
        <input name="kpiUnidad" aria-label="Unidad del KPI" placeholder="%, videos, leads" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63]">Actual
        <input name="kpiActual" inputMode="decimal" aria-label="Valor actual del KPI" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[#3d4a63] sm:col-span-2">Bloqueo
        <input name="bloqueo" aria-label="Bloqueo" className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" disabled={pending} className="h-10 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Guardar</button>
        <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm">Cerrar</button>
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

