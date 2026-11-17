"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Avatar, IconoPrioridad, IconoTipo } from "@/components/iconos-planer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { transicionarAction } from "@/server/actions"
import { camposRequeridos, tituloConfirmacion } from "@/lib/tablero-movimiento"
import { COLUMNAS_KANBAN, claveGrupo, columnaDeEstado, necesitaInformacion, transicionHaciaColumna, type ColumnaKanban, type GrupoTablero } from "@/lib/kanban"
import { FilterIcon, MoreHorizontalIcon, SlidersHorizontalIcon } from "lucide-react"
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
  moves: { name: string; to: string; requiresComment?: boolean; requiresDelivery?: boolean; requiresAssignee?: boolean; requiresCommittedDate?: boolean }[]
}

export type EstadoEspacio = { key: string; name: string; category: string }

export function TableroEspacio({
  tarjetas,
  estados,
  actorId,
  espacioId,
}: {
  tarjetas: TarjetaEspacio[]
  estados: EstadoEspacio[]
  actorId: string
  espacioId: string
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [personas, setPersonas] = useState<string[]>([])
  const [prioridad, setPrioridad] = useState("")
  const [area, setArea] = useState("")
  const [chip, setChip] = useState(false)
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [menu, setMenu] = useState(false)
  const [grupo, setGrupo] = useState<GrupoTablero>("ninguno")
  const [pending, start] = useTransition()
  const [confirma, setConfirma] = useState<TarjetaEspacio["moves"][number] & { code: string } | null>(null)
  const [motivo, setMotivo] = useState("")
  const [entrega, setEntrega] = useState("")
  const avatares = [...new Set(tarjetas.map((item) => item.asignado).filter(Boolean))]
  const yo = tarjetas.find((item) => item.assigneeId === actorId)?.asignado
  const areas = [...new Set(tarjetas.map((item) => item.area).filter(Boolean))]
  const visibles = tarjetas.filter((item) => {
    const texto = `${item.title} ${item.code}`.toLowerCase()
    if (q && !texto.includes(q.toLowerCase())) return false
    if (personas.length && !personas.includes(item.asignado)) return false
    if (prioridad && item.priority !== prioridad) return false
    if (area && item.area !== area) return false
    if (chip && !necesitaInformacion(item.status)) return false
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
    setMotivo("")
    setEntrega("")
    setConfirma({ code, ...decision.move })
  }

  function aplicar() {
    if (!confirma) return
    const data = new FormData()
    data.set("code", confirma.code)
    data.set("name", confirma.name)
    if (motivo.trim()) data.set("comment", motivo.trim())
    if (entrega.trim()) data.set("deliveryUrl", entrega.trim())
    start(async () => {
      const result = await transicionarAction(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || `${confirma.code} cambió de columna.`)
      setConfirma(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(event) => setQ(event.target.value)} aria-label="Buscar en el tablero" placeholder="Buscar en el tablero" className="h-8 w-56 rounded-md border border-[#dfe1e6] bg-white px-3 text-sm" />
        <div className="flex -space-x-1.5" aria-label="Filtrar por persona">
          {avatares.slice(0, 8).map((nombre) => (
            <button key={nombre} type="button" title={nombre} aria-pressed={personas.includes(nombre)} className={`rounded-full ring-2 ${personas.includes(nombre) || nombre === yo ? "ring-[#1658B0]" : "ring-white"}`} onClick={() => setPersonas((prev) => prev.includes(nombre) ? prev.filter((item) => item !== nombre) : [...prev, nombre])}>
              <Avatar nombre={nombre} />
            </button>
          ))}
        </div>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm hover:bg-white" aria-expanded={filtroAbierto} onClick={() => setFiltroAbierto((valor) => !valor)}>
          <FilterIcon className="size-4" /> Filtro
        </button>
        <label className="inline-flex h-8 items-center gap-1 text-sm">
          <span className="sr-only">Agrupar</span>
          <select aria-label="Agrupar" value={grupo} onChange={(event) => setGrupo(event.target.value as GrupoTablero)} className="h-8 rounded-md bg-transparent px-1 text-sm">
            <option value="ninguno">Agrupar</option>
            <option value="asignado">Por persona</option>
            <option value="prioridad">Por prioridad</option>
            <option value="area">Por área</option>
          </select>
        </label>
        <button type="button" aria-pressed={chip} onClick={() => setChip((valor) => !valor)} className={`h-8 rounded-full px-3 text-sm ${chip ? "bg-[#F1CEB3] font-medium text-[#15122A]" : "bg-white text-[#15122A] ring-1 ring-[#F0A486]"}`}>
          Necesita información
        </button>
        <span className="ml-auto flex items-center">
          <button type="button" className="inline-flex size-8 items-center justify-center rounded hover:bg-white" aria-label="Vista" onClick={() => toast.message("La vista muestra título, clave, prioridad y responsable.")}>
            <SlidersHorizontalIcon className="size-4" />
          </button>
          <button type="button" className="inline-flex size-8 items-center justify-center rounded hover:bg-white" aria-label="Más opciones del tablero" aria-expanded={menu} onClick={() => setMenu((valor) => !valor)}>
            <MoreHorizontalIcon className="size-4" />
          </button>
        </span>
      </div>
      {filtroAbierto ? (
        <div className="flex flex-wrap gap-2 rounded-md bg-white p-2">
          <select aria-label="Prioridad" value={prioridad} onChange={(event) => setPrioridad(event.target.value)} className="h-8 rounded-md border border-[#dfe1e6] px-2 text-sm">
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select aria-label="Área" value={area} onChange={(event) => setArea(event.target.value)} className="h-8 rounded-md border border-[#dfe1e6] px-2 text-sm">
            <option value="">Todas las áreas</option>
            {areas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      ) : null}
      {menu ? <p className="text-right text-xs text-muted-foreground">Arrastre una tarjeta solo si su rol puede hacer esa transición.</p> : null}
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
                <section key={columna} className="flex min-h-40 flex-col rounded-lg bg-[#F4F5F7] p-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { if (!pending) soltar(event, columna) }}>
                  <h3 className="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-[#44546f]">{columna} {cartas.length}</h3>
                  <div className="grid gap-2">
                    {cartas.map((item) => (
                      <article key={item.code} draggable={!pending} onDragStart={(event) => { event.dataTransfer.setData("text/plain", item.code); event.dataTransfer.effectAllowed = "move" }} className="cursor-grab rounded-md border border-[#dfe1e6] bg-white p-3 text-sm shadow-[0_1px_1px_rgba(9,30,66,0.12)]">
                        <Link href={`/requerimientos/${item.code}`} className="line-clamp-2 font-medium leading-5 text-[#15122A] hover:underline">{item.title}</Link>
                        <p className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded bg-[#F1F2F4] px-1.5 py-0.5 text-xs text-[#44546f]">{item.area}</span>
                          {necesitaInformacion(item.status) ? <span className="rounded-full bg-[#F1CEB3] px-2 py-0.5 text-xs text-[#15122A]">Necesita información</span> : null}
                        </p>
                        <p className="mt-3 flex items-center gap-1.5">
                          <IconoTipo nombre={item.tipo} />
                          <Link href={`/requerimientos/${item.code}`} className="text-xs font-medium text-[#1658B0] hover:underline">{item.code}</Link>
                          <span className="ml-auto flex items-center gap-1">
                            <IconoPrioridad prioridad={item.priority} />
                            {item.asignado ? <Avatar nombre={item.asignado} marca={item.marca} /> : null}
                          </span>
                        </p>
                      </article>
                    ))}
                  </div>
                  <Link href={`/espacios/${espacioId}/formularios`} className="mt-2 inline-flex items-center gap-1 rounded px-1 py-1 text-sm text-[#44546f] hover:bg-white">
                    + Crear
                  </Link>
                </section>
              )
            })}
          </div>
        </section>
      ))}
      <Dialog open={Boolean(confirma)} onOpenChange={(abierto) => { if (!abierto && !pending) setConfirma(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirma ? tituloConfirmacion(confirma.name) : "Confirmar"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirma ? `${confirma.code} cambiará con «${confirma.name}». Si cancela, la tarjeta se queda donde está.` : null}</p>
          {confirma && camposRequeridos(confirma).length > 0 ? <p className="text-sm">Este paso pide: {camposRequeridos(confirma).join(", ")}.</p> : <p className="text-sm">Este paso no pide datos adicionales.</p>}
          {confirma?.requiresComment || confirma?.to === "CERRADO" ? (
            <label className="grid gap-1 text-sm">
              Comentario
              <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} className="min-h-20 rounded-md border border-[#dfe1e6] px-2 py-1" />
            </label>
          ) : null}
          {confirma?.requiresDelivery ? (
            <label className="grid gap-1 text-sm">
              Enlace de la entrega
              <input value={entrega} onChange={(event) => setEntrega(event.target.value)} className="h-9 rounded-md border border-[#dfe1e6] px-2" />
            </label>
          ) : null}
          {confirma && (confirma.requiresAssignee || confirma.requiresCommittedDate) ? (
            <p className="text-sm">El responsable o la fecha se completan en el detalle si todavía no están.</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirma(null)} disabled={pending}>Cancelar</Button>
            <Button type="button" onClick={aplicar} disabled={pending || !confirma}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
