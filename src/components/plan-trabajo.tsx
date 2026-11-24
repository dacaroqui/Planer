"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/iconos-planer"
import { EstadoVacio } from "@/components/estado-vacio"
import {
  ESTADO_TAREA_LABEL,
  areasDelPlan,
  estadosEditables,
  filtrarPlan,
  resumenEstados,
  textoFechas,
  type EstadoTareaPlan,
  type FilaPlan,
} from "@/lib/plan-trabajo"
import { editarPlanAction } from "@/server/plan-actions"

const PILLS: Record<EstadoTareaPlan, string> = {
  PENDIENTE: "bg-[#F3F4F6] text-[#3d4a63]",
  EN_CURSO: "bg-[#E7F0FB] text-[#1658B0]",
  HECHA: "bg-emerald-100 text-emerald-800",
}

export function PlanTrabajo({
  filas,
  hayProyectos,
  responsables,
}: {
  filas: FilaPlan[]
  hayProyectos: boolean
  responsables: { id: string; name: string; teams: string[] }[]
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
  const areas = areasDelPlan(filas)
  const proyectos = [...new Map(filas.map((fila) => [fila.proyectoId, fila.proyecto])).entries()]
  const personas = [...new Set(filas.flatMap((fila) => [fila.responsable, ...fila.participantes]).filter((nombre) => nombre && nombre !== "Sin asignar"))].sort()
  const visibles = useMemo(
    () => filtrarPlan(filas, { q, area, persona, estado, proyecto, sinAsignar, bloqueadas }),
    [filas, q, area, persona, estado, proyecto, sinAsignar, bloqueadas],
  )
  const resumen = resumenEstados(visibles)
  const grupos = agrupar(visibles)
  const exportar = `/api/plan/exportar?${new URLSearchParams({
    q, area, persona, estado, proyecto,
    ...(sinAsignar ? { sinAsignar: "1" } : {}),
    ...(bloqueadas ? { bloqueadas: "1" } : {}),
  }).toString()}`

  if (!hayProyectos) {
    return <EstadoVacio titulo="Todavía no hay proyectos" texto="Cuando exista un proyecto visible para usted, su plan de trabajo aparecerá en esta hoja." />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {resumen.map((item) => (
          <span key={item.estado} className={`rounded-full px-3 py-1 text-sm font-medium ${PILLS[item.estado]}`}>
            {item.label} {item.total}
          </span>
        ))}
        <span className="text-sm text-muted-foreground">{visibles.length} {visibles.length === 1 ? "actividad" : "actividades"}</span>
        <a href={exportar} className="ml-auto inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm font-medium text-[#1658B0]">Exportar .xlsx</a>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <SearchIcon className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
          <input value={q} onChange={(event) => setQ(event.target.value)} aria-label="Buscar en el plan" placeholder="Buscar actividad, persona o bloqueo" className="h-10 w-64 rounded-lg border border-[#E4E7EC] bg-white pr-3 pl-9 text-sm" />
        </label>
        <select aria-label="Área" value={area} onChange={(event) => setArea(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Área</option>
          {areas.map((item) => <option key={item.team} value={item.team}>{item.area}</option>)}
        </select>
        <select aria-label="Persona" value={persona} onChange={(event) => setPersona(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Persona</option>
          {personas.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
        </select>
        <select aria-label="Estado" value={estado} onChange={(event) => setEstado(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Estado</option>
          {resumenEstados(filas).map((item) => <option key={item.estado} value={item.estado}>{item.label}</option>)}
        </select>
        <select aria-label="Proyecto" value={proyecto} onChange={(event) => setProyecto(event.target.value)} className="h-10 max-w-56 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
          <option value="">Proyecto</option>
          {proyectos.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sinAsignar} onChange={(event) => setSinAsignar(event.target.checked)} /> Solo sin asignar</label>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={bloqueadas} onChange={(event) => setBloqueadas(event.target.checked)} /> Solo bloqueadas</label>
      </div>
      {visibles.length === 0 ? (
        <EstadoVacio compacto titulo="Ninguna actividad coincide" texto="Quite un filtro o busque con otras palabras." />
      ) : (
        <div className="max-h-[calc(100vh-14rem)] overflow-auto rounded-xl border border-[#E4E7EC] bg-white">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#F8FAFD] text-xs text-muted-foreground">
              <tr>
                {["Proyecto", "Área", "Actividad", "Responsable", "Participantes", "Estado", "Bloqueo", "Fechas", ""].map((columna) => (
                  <th key={columna || "acciones"} className="border-b border-[#E4E7EC] px-3 py-2 font-medium">{columna}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => grupo.filas.map((fila, indice) => (
                <tr key={fila.id} className="align-top odd:bg-white even:bg-[#FCFDFE]">
                  {indice === 0 ? (
                    <td rowSpan={grupo.filas.length} className="border-r border-b border-[#E4E7EC] bg-[#F4F8FE] px-3 py-3 font-medium text-[#15122A]">
                      <Link href={`/proyectos/${fila.proyectoId}`} className="text-[#1658B0] hover:underline">{fila.proyecto}</Link>
                    </td>
                  ) : null}
                  {indice === 0 ? (
                    <td rowSpan={grupo.filas.length} className="border-r border-b border-[#E4E7EC] px-3 py-3 text-[#3d4a63]">{fila.area}</td>
                  ) : null}
                  <td className="border-b border-[#F0F2F5] px-3 py-2">
                    <Link href={`/proyectos/${fila.proyectoId}#tarea-${fila.id}`} className="font-medium text-[#1658B0] hover:underline">{fila.actividad}</Link>
                    {editId === fila.id ? (
                      <Editor fila={fila} responsables={responsables.filter((persona) => !fila.team || persona.teams.includes(fila.team))} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); router.refresh() }} />
                    ) : null}
                  </td>
                  <td className="border-b border-[#F0F2F5] px-3 py-2">
                    {fila.responsableId ? (
                      <span className="inline-flex items-center gap-2"><Avatar nombre={fila.responsable} />{fila.responsable}</span>
                    ) : <span className="inline-flex whitespace-nowrap rounded-full bg-[#FEF3C7] px-2 py-0.5 font-medium text-[#92400E]">Sin asignar</span>}
                  </td>
                  <td className="border-b border-[#F0F2F5] px-3 py-2 text-[#3d4a63]">{fila.participantes.join(", ") || "—"}</td>
                  <td className="border-b border-[#F0F2F5] px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILLS[fila.estado]}`}>{ESTADO_TAREA_LABEL[fila.estado]}</span></td>
                  <td className={`border-b border-[#F0F2F5] px-3 py-2 ${fila.bloqueo ? "font-medium text-red-700" : "text-muted-foreground"}`}>{fila.bloqueo || "—"}</td>
                  <td className="border-b border-[#F0F2F5] px-3 py-2 whitespace-nowrap text-[#3d4a63]">{textoFechas(fila)}</td>
                  <td className="border-b border-[#F0F2F5] px-3 py-2">
                    {fila.puedeEditar ? <button type="button" className="text-sm font-medium text-[#1658B0]" onClick={() => setEditId(fila.id)}>Editar</button> : null}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function agrupar(filas: FilaPlan[]) {
  const grupos: { id: string; filas: FilaPlan[] }[] = []
  for (const fila of filas) {
    const ultimo = grupos.at(-1)
    if (ultimo?.id === fila.proyectoId) ultimo.filas.push(fila)
    else grupos.push({ id: fila.proyectoId, filas: [fila] })
  }
  return grupos
}

function Editor({
  fila,
  responsables,
  onClose,
  onSaved,
}: {
  fila: FilaPlan
  responsables: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, start] = useTransition()
  const opciones = estadosEditables(fila.estado)
  return (
    <form
      className="mt-2 grid gap-2 rounded-lg border border-[#E7F0FB] bg-[#F8FAFD] p-2"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        start(async () => {
          const resultado = await editarPlanAction(data)
          if (!resultado.ok) {
            toast.error(resultado.error)
            return
          }
          toast.success(resultado.message)
          onSaved()
        })
      }}
    >
      <input type="hidden" name="id" value={fila.id} />
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
      <label className="grid gap-1 text-xs">Bloqueo
        <input name="bloqueo" aria-label="Bloqueo de la fila" defaultValue={fila.bloqueo} className="h-9 rounded-md border border-[#E4E7EC] bg-white px-2 text-sm" />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="h-8 rounded-md bg-[#1658B0] px-3 text-xs font-medium text-white">Guardar</button>
        <button type="button" onClick={onClose} className="h-8 rounded-md border border-[#E4E7EC] px-3 text-xs">Cerrar</button>
      </div>
    </form>
  )
}
