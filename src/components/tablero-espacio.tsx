"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Avatar, IconoPrioridad, IconoTipo } from "@/components/iconos-planer"
import { transicionarAction } from "@/server/actions"
import { COLUMNAS_KANBAN, claveGrupo, columnaDeEstado, transicionHaciaColumna, type ColumnaKanban, type GrupoTablero } from "@/lib/kanban"
import { PRIORITY_LABEL } from "@/lib/domain"

export type TarjetaEspacio = {
  code: string
  title: string
  status: string
  priority: string
  tipo: string
  area: string
  marca: string
  asignado: string
  assigneeId: string | null
  moves: { name: string; to: string; requiresComment?: boolean; requiresDelivery?: boolean }[]
}

export type EstadoEspacio = { key: string; name: string; category: string }

export function TableroEspacio({
  tarjetas,
  estados,
  actorId,
}: {
  tarjetas: TarjetaEspacio[]
  estados: EstadoEspacio[]
  actorId: string
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [personas, setPersonas] = useState<string[]>([])
  const [prioridad, setPrioridad] = useState("")
  const [area, setArea] = useState("")
  const [chip, setChip] = useState("todos")
  const [grupo, setGrupo] = useState<GrupoTablero>("ninguno")
  const [pending, start] = useTransition()
  const avatares = [...new Set(tarjetas.map((item) => item.asignado).filter(Boolean))]
  const areas = [...new Set(tarjetas.map((item) => item.area).filter(Boolean))]
  const visibles = tarjetas.filter((item) => {
    const texto = `${item.title} ${item.code}`.toLowerCase()
    if (q && !texto.includes(q.toLowerCase())) return false
    if (personas.length && !personas.includes(item.asignado)) return false
    if (prioridad && item.priority !== prioridad) return false
    if (area && item.area !== area) return false
    if (chip === "mias" && item.assigneeId !== actorId) return false
    if (chip === "alta" && item.priority !== "ALTA" && item.priority !== "CRITICA") return false
    if (chip === "sin" && item.assigneeId) return false
    return true
  })
  const grupos = useMemo(() => {
    const mapa = new Map<string, TarjetaEspacio[]>()
    for (const item of visibles) {
      const clave = claveGrupo(item, grupo)
      mapa.set(clave, [...(mapa.get(clave) ?? []), item])
    }
    return [...mapa.entries()]
  }, [visibles, grupo])

  function soltar(event: React.DragEvent<HTMLElement>, columna: ColumnaKanban) {
    event.preventDefault()
    const code = event.dataTransfer.getData("text/plain")
    const tarjeta = tarjetas.find((item) => item.code === code)
    if (!tarjeta) return
    const actual = estados.find((item) => item.key === tarjeta.status)
    if (actual && columnaDeEstado(actual) === columna) return
    const decision = transicionHaciaColumna(tarjeta.moves, estados, columna)
    if (!decision.ok) {
      toast.error(decision.error)
      return
    }
    if (decision.move.requiresComment || decision.move.requiresDelivery || decision.move.to === "CERRADO") {
      toast.error("Ese paso pide datos en el detalle. La tarjeta vuelve a su lugar.")
      return
    }
    const data = new FormData()
    data.set("code", code)
    data.set("name", decision.move.name)
    start(async () => {
      const result = await transicionarAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || `${code} cambió de columna.`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(event) => setQ(event.target.value)} aria-label="Buscar en el tablero" placeholder="Buscar en el tablero" className="h-9 min-w-48 flex-1 rounded-md border border-input bg-white px-3 text-sm" />
        <div className="flex -space-x-2" aria-label="Filtrar por persona">
          {avatares.slice(0, 6).map((nombre) => (
            <button key={nombre} type="button" title={nombre} aria-pressed={personas.includes(nombre)} className={`rounded-full ring-2 ring-white ${personas.includes(nombre) ? "ring-[#1658B0]" : ""}`} onClick={() => setPersonas((prev) => prev.includes(nombre) ? prev.filter((item) => item !== nombre) : [...prev, nombre])}>
              <Avatar nombre={nombre} />
            </button>
          ))}
        </div>
        <select aria-label="Filtro de prioridad" value={prioridad} onChange={(event) => setPrioridad(event.target.value)} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
          <option value="">Filtro</option>
          {Object.entries(PRIORITY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select aria-label="Agrupar" value={grupo} onChange={(event) => setGrupo(event.target.value as GrupoTablero)} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
          <option value="ninguno">Agrupar</option>
          <option value="asignado">Por persona</option>
          <option value="prioridad">Por prioridad</option>
          <option value="area">Por área</option>
        </select>
        <select aria-label="Área" value={area} onChange={(event) => setArea(event.target.value)} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
          <option value="">Todas las áreas</option>
          {areas.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["todos", "Todos"],
          ["mias", "Mis asignaciones"],
          ["alta", "Alta o crítica"],
          ["sin", "Sin asignar"],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setChip(id)} className={`rounded-full px-3 py-1 text-xs ${chip === id ? "bg-[#1658B0] text-white" : "bg-white text-[#1658B0] ring-1 ring-[#1658B0]"}`}>{label}</button>
        ))}
      </div>
      {grupos.map(([nombre, filas]) => (
        <section key={nombre} className="space-y-2">
          {grupo !== "ninguno" ? <h2 className="text-sm font-medium">{nombre}</h2> : null}
          <div className="grid gap-3 md:grid-cols-4">
            {COLUMNAS_KANBAN.map((columna) => {
              const cartas = filas.filter((item) => {
                const estado = estados.find((row) => row.key === item.status)
                return estado ? columnaDeEstado(estado) === columna : columna === "Por hacer"
              })
              return (
                <section key={columna} className="rounded-lg bg-[#F4F7FC] p-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { if (!pending) soltar(event, columna) }}>
                  <h3 className="px-1 py-2 text-sm font-medium">{columna} <span className="text-muted-foreground">{cartas.length}</span></h3>
                  <div className="grid gap-2">
                    {cartas.map((item) => (
                      <article key={item.code} draggable={!pending} onDragStart={(event) => { event.dataTransfer.setData("text/plain", item.code); event.dataTransfer.effectAllowed = "move" }} className="rounded-md border border-border bg-white p-3 text-sm shadow-sm">
                        <Link href={`/requerimientos/${item.code}`} className="font-medium hover:underline">{item.title}</Link>
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <IconoTipo nombre={item.tipo} />
                          <span className="rounded bg-[#E1EBF9] px-1.5 py-0.5 text-[#222B7C]">{item.area}</span>
                          <span className="font-medium text-[#1658B0]">{item.code}</span>
                        </p>
                        <p className="mt-2 flex items-center justify-between">
                          <IconoPrioridad prioridad={item.priority} />
                          {item.asignado ? <Avatar nombre={item.asignado} marca={item.marca} /> : <span className="text-xs text-muted-foreground">—</span>}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
