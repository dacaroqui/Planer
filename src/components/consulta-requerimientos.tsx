"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { BookmarkIcon, FilterIcon, SearchIcon, XIcon } from "lucide-react"
import { AccionesMasivas } from "@/components/acciones-masivas"
import { MenuEliminarRequerimiento } from "@/components/confirmar-eliminar"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { Elegir } from "@/components/ui/elegir"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { PRIORITY_LABEL, STATUS_LABEL, statusLabel, type PriorityName, type SlaState } from "@/lib/domain"
import { ZONE } from "@/lib/time"

type Opcion = { value: string; label: string }

export type FilaConsulta = {
  code: string
  title: string
  status: string
  priority: string
  typeName: string
  requester: string
  updatedAt: string
  sla: SlaState
}

const TAMANOS = [7, 10, 25, 50]
const control = "h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#15122A]"

export function ConsultaRequerimientos({
  items,
  total,
  page,
  pages,
  empresas,
  proyectos,
  tipos,
  areas,
  solicitantes,
  puedePrioridad,
  puedeEstado,
  puedeAsignar,
  puedeEliminar,
  agentes,
}: {
  items: FilaConsulta[]
  total: number
  page: number
  pages: number
  empresas: Opcion[]
  proyectos: Opcion[]
  tipos: Opcion[]
  areas: Opcion[]
  solicitantes: Opcion[]
  puedePrioridad: boolean
  puedeEstado: boolean
  puedeAsignar: boolean
  puedeEliminar: boolean
  agentes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [abierto, setAbierto] = useState(false)
  const [vistas, setVistas] = useState<{ nombre: string; query: string }[]>([])
  const [elegidos, setElegidos] = useState<string[]>([])
  const pageSize = TAMANOS.includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 7
  const tab = params.get("assigned") === "1" ? "asignados" : params.get("mine") === "1" ? "mios" : "todos"
  const estados = useMemo(() => Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })), [])

  useEffect(() => {
    try {
      setVistas(JSON.parse(localStorage.getItem("mesa-vistas") || "[]"))
    } catch {
      setVistas([])
    }
  }, [])
  useEffect(() => {
    setElegidos((prev) => prev.filter((code) => items.some((item) => item.code === code)))
  }, [items])

  function ir(next: URLSearchParams) {
    next.delete("page")
    const query = next.toString()
    router.push(query ? `/requerimientos?${query}` : "/requerimientos")
  }
  function poner(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString())
    if (!valor) next.delete(clave)
    else next.set(clave, valor)
    ir(next)
  }
  function elegirTab(valor: "todos" | "mios" | "asignados") {
    const next = new URLSearchParams(params.toString())
    next.delete("mine")
    next.delete("assigned")
    if (valor === "mios") next.set("mine", "1")
    if (valor === "asignados") next.set("assigned", "1")
    ir(next)
  }
  function limpiar() {
    const next = new URLSearchParams()
    if (params.get("mine") === "1") next.set("mine", "1")
    if (params.get("assigned") === "1") next.set("assigned", "1")
    if (params.get("pageSize")) next.set("pageSize", params.get("pageSize") || "")
    ir(next)
  }

  const catalogo = catalogoDe(estados, empresas, proyectos, tipos, areas, solicitantes)
  const activos = pillsActivas(params, catalogo)
  const inicio = total === 0 ? 0 : (page - 1) * pageSize + 1
  const fin = Math.min(page * pageSize, total)
  const seleccionable = puedePrioridad || puedeEstado || puedeAsignar || puedeEliminar
  const todos = items.length > 0 && items.every((item) => elegidos.includes(item.code))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-[#15122A]">Requerimientos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulta y gestiona los requerimientos de tu equipo.</p>
      </div>
      <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-1" role="tablist" aria-label="Alcance">
        {([
          ["todos", "Todos"],
          ["mios", "Creados por mí"],
          ["asignados", "Asignados a mí"],
        ] as const).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={tab === valor}
            className={tab === valor ? "rounded-md bg-[#1658B0] px-3 py-1.5 text-sm font-medium text-white" : "rounded-md px-3 py-1.5 text-sm text-[#3d4a63] hover:bg-[#F4F7FC]"}
            onClick={() => elegirTab(valor)}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative min-w-56 flex-1" onSubmit={(event) => {
          event.preventDefault()
          poner("q", String(new FormData(event.currentTarget).get("q") || "").trim())
        }}>
          <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <input name="q" defaultValue={params.get("q") ?? ""} aria-label="Buscar requerimientos" placeholder="Buscar requerimientos..." className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pr-3 pl-9 text-sm" />
        </form>
        <Selecto etiqueta="Estado" valor={params.get("status") ?? ""} onChange={(valor) => poner("status", valor)} opciones={[{ value: "", label: "Estado" }, ...estados]} />
        <Selecto etiqueta="Equipo" valor={params.get("team") ?? ""} onChange={(valor) => poner("team", valor)} opciones={[{ value: "", label: "Equipo" }, { value: "DESARROLLO", label: "Desarrollo" }, { value: "MARKETING", label: "Marketing" }]} />
        <Selecto etiqueta="Prioridad" valor={params.get("priority") ?? ""} onChange={(valor) => poner("priority", valor)} opciones={[{ value: "", label: "Prioridad" }, { value: "CRITICA", label: "Crítica" }, { value: "ALTA", label: "Alta" }, { value: "MEDIA", label: "Media" }, { value: "BAJA", label: "Baja" }]} />
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#1658B0] bg-white px-3 text-sm font-medium text-[#1658B0] hover:bg-[#E7F0FB]">
          <FilterIcon className="size-4" /> Más filtros{activos.length ? ` · ${activos.length}` : ""}
        </button>
      </div>
      {activos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activos.map((pill) => (
            <button key={pill.clave} type="button" onClick={() => poner(pill.clave, "")} className="inline-flex items-center gap-1 rounded-full border border-[#D7E3F4] bg-white px-2.5 py-1 text-xs text-[#222B7C]">
              {pill.texto} <XIcon className="size-3" />
            </button>
          ))}
          <button type="button" onClick={limpiar} className="text-xs font-medium text-[#1658B0] hover:underline">Limpiar filtros</button>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{total.toLocaleString("es-CO")} requerimientos</p>
        <button type="button" className="inline-flex items-center gap-1 text-sm text-[#1658B0] hover:underline" onClick={() => {
          const nombre = window.prompt("Nombre de la vista")
          if (!nombre) return
          const siguientes = [...vistas.filter((item) => item.nombre !== nombre), { nombre, query: params.toString() }]
          localStorage.setItem("mesa-vistas", JSON.stringify(siguientes))
          setVistas(siguientes)
        }}>
          <BookmarkIcon className="size-4" /> Guardar vista
        </button>
      </div>
      {vistas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {vistas.map((vista) => (
            <button key={vista.nombre} type="button" className="rounded-full border border-[#D7E3F4] bg-white px-2.5 py-1 text-xs text-[#1658B0]" onClick={() => router.push(vista.query ? `/requerimientos?${vista.query}` : "/requerimientos")}>{vista.nombre}</button>
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-[#E8EEF6]">
                <th className="w-10 px-3 py-3">
                  {seleccionable ? <input type="checkbox" aria-label="Seleccionar todos" checked={todos} onChange={(event) => setElegidos(event.target.checked ? items.map((item) => item.code) : [])} /> : <span className="sr-only">Seleccionar</span>}
                </th>
                <th className="px-3 py-3 font-medium">Requerimiento</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">SLA</th>
                <th className="px-3 py-3 font-medium">Actualizado</th>
                {puedeEliminar ? <th className="px-3 py-3"><span className="sr-only">Acciones</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={puedeEliminar ? 6 : 5} className="px-3 py-10 text-center text-sm text-muted-foreground">No hay requerimientos con esos filtros.</td></tr>
              ) : items.map((item) => (
                <tr key={item.code} className="border-b border-[#F0F4FA] last:border-0 hover:bg-[#F8FAFD]">
                  <td className="px-3 py-3 align-top">
                    {seleccionable ? <input type="checkbox" aria-label={`Seleccionar ${item.code}`} checked={elegidos.includes(item.code)} onChange={(event) => setElegidos((prev) => event.target.checked ? [...prev, item.code] : prev.filter((code) => code !== item.code))} /> : null}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/requerimientos/${item.code}`} className="font-medium text-[#15122A] hover:text-[#1658B0] hover:underline">{item.title}</Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.code} · {item.typeName} · {PRIORITY_LABEL[item.priority as PriorityName] ?? item.priority} · {item.requester}</p>
                  </td>
                  <td className="px-3 py-3"><EstadoBadge status={item.status} etiqueta={etiquetaEstado(item.status)} /></td>
                  <td className="px-3 py-3"><SlaBadge state={item.sla} /></td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{fechaLista(item.updatedAt)}</td>
                  {puedeEliminar ? <td className="px-3 py-3"><MenuEliminarRequerimiento code={item.code} title={item.title} /></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EEF6] px-3 py-2 text-sm">
          <p className="text-muted-foreground">Mostrando {inicio.toLocaleString("es-CO")}–{fin.toLocaleString("es-CO")} de {total.toLocaleString("es-CO")}</p>
          <div className="flex items-center gap-2">
            <select aria-label="Resultados por página" className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2 text-sm" value={String(pageSize)} onChange={(event) => poner("pageSize", event.target.value)}>
              {TAMANOS.map((tamano) => <option key={tamano} value={tamano}>{tamano} por página</option>)}
            </select>
            <Paginador page={page} pages={pages} onPage={(siguiente) => {
              const next = new URLSearchParams(params.toString())
              next.set("page", String(siguiente))
              const query = next.toString()
              router.push(query ? `/requerimientos?${query}` : "/requerimientos")
            }} />
          </div>
        </div>
      </div>
      {seleccionable ? (
        <AccionesMasivas
          codes={elegidos}
          puedePrioridad={puedePrioridad}
          puedeEstado={puedeEstado}
          puedeAsignar={puedeAsignar}
          puedeEliminar={puedeEliminar}
          seleccion={items.filter((item) => elegidos.includes(item.code)).map((item) => ({ code: item.code, title: item.title }))}
          estados={estados}
          agentes={agentes}
          onLimpiar={() => setElegidos([])}
        />
      ) : null}
      <CajonFiltros
        abierto={abierto}
        onOpenChange={setAbierto}
        empresas={empresas}
        proyectos={proyectos}
        tipos={tipos}
        areas={areas}
        solicitantes={solicitantes}
        onAplicar={(valores) => {
          const next = new URLSearchParams(params.toString())
          next.set("fecha", "actualizacion")
          for (const [clave, valor] of Object.entries(valores)) {
            if (!valor) next.delete(clave)
            else next.set(clave, valor)
          }
          ir(next)
          setAbierto(false)
        }}
      />
    </div>
  )
}

function Selecto({ etiqueta, valor, opciones, onChange }: { etiqueta: string; valor: string; opciones: Opcion[]; onChange: (valor: string) => void }) {
  return <Elegir className="w-44" ariaLabel={etiqueta} value={valor} onValueChange={onChange} placeholder={etiqueta} opciones={opciones} />
}

function Paginador({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  const botones: number[] = []
  for (let numero = 1; numero <= pages; numero += 1) {
    if (numero === 1 || numero === pages || Math.abs(numero - page) <= 1) botones.push(numero)
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Página anterior" disabled={page <= 1} className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white disabled:opacity-40" onClick={() => onPage(page - 1)}>‹</button>
      {botones.map((numero, indice) => (
        <span key={numero} className="flex items-center">
          {indice > 0 && botones[indice - 1] !== numero - 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <button type="button" aria-current={numero === page ? "page" : undefined} className={numero === page ? "inline-flex size-8 items-center justify-center rounded-lg bg-[#1658B0] text-sm text-white" : "inline-flex size-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-sm"} onClick={() => onPage(numero)}>{numero}</button>
        </span>
      ))}
      <button type="button" aria-label="Página siguiente" disabled={page >= pages} className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white disabled:opacity-40" onClick={() => onPage(page + 1)}>›</button>
    </div>
  )
}

function CajonFiltros({
  abierto,
  onOpenChange,
  empresas,
  proyectos,
  tipos,
  areas,
  solicitantes,
  onAplicar,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  empresas: Opcion[]
  proyectos: Opcion[]
  tipos: Opcion[]
  areas: Opcion[]
  solicitantes: Opcion[]
  onAplicar: (valores: Record<string, string>) => void
}) {
  const params = useSearchParams()
  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] bg-white sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle>Más filtros</SheetTitle>
        </SheetHeader>
        <form key={params.toString()} className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          onAplicar({
            empresa: String(data.get("empresa") || ""),
            brand: String(data.get("brand") || ""),
            area: String(data.get("area") || ""),
            proyecto: String(data.get("proyecto") || ""),
            tipo: String(data.get("tipo") || ""),
            solicitante: String(data.get("solicitante") || ""),
            from: String(data.get("from") || ""),
            to: String(data.get("to") || ""),
          })
        }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-4">
            <Seccion titulo="Organización">
              <Campo nombre="empresa" etiqueta="Empresa" valor={params.get("empresa") ?? ""} opciones={[{ value: "", label: "Todas las empresas" }, ...empresas]} />
              <Campo nombre="brand" etiqueta="Marca" valor={params.get("brand") ?? ""} opciones={[{ value: "", label: "Todas las marcas" }, { value: "CIFES", label: "CIFES" }, { value: "LUVANIA", label: "Luvania" }, { value: "AMBAS", label: "Ambas/Transversal" }]} />
              <Campo nombre="area" etiqueta="Área" valor={params.get("area") ?? ""} opciones={[{ value: "", label: "Todas las áreas" }, ...areas]} />
            </Seccion>
            <Seccion titulo="Solicitud">
              <Campo nombre="proyecto" etiqueta="Proyecto" valor={params.get("proyecto") ?? ""} opciones={[{ value: "", label: "Todos los proyectos" }, ...proyectos]} />
              <Campo nombre="tipo" etiqueta="Tipo" valor={params.get("tipo") ?? ""} opciones={[{ value: "", label: "Todos los tipos" }, ...tipos]} />
              <Campo nombre="solicitante" etiqueta="Solicitante" valor={params.get("solicitante") ?? ""} opciones={[{ value: "", label: "Todos los solicitantes" }, ...solicitantes]} />
            </Seccion>
            <Seccion titulo="Fecha de actualización">
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">Desde<input className={control} type="date" name="from" lang="es-CO" defaultValue={params.get("from") ?? ""} /></label>
                <label className="grid gap-1 text-xs text-muted-foreground">Hasta<input className={control} type="date" name="to" lang="es-CO" defaultValue={params.get("to") ?? ""} /></label>
              </div>
            </Seccion>
          </div>
          <SheetFooter className="flex-row">
            <button type="button" className="h-10 flex-1 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium" onClick={() => onAplicar({ empresa: "", brand: "", area: "", proyecto: "", tipo: "", solicitante: "", from: "", to: "" })}>Limpiar</button>
            <button type="submit" className="h-10 flex-1 rounded-lg bg-[#1658B0] text-sm font-medium text-white hover:bg-[#222B7C]">Aplicar filtros</button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

function Campo({ nombre, etiqueta, valor, opciones }: { nombre: string; etiqueta: string; valor: string; opciones: Opcion[] }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <select name={nombre} aria-label={etiqueta} defaultValue={valor} className={control}>
        {opciones.map((opcion) => <option key={opcion.value || `${nombre}-vacio`} value={opcion.value}>{opcion.label}</option>)}
      </select>
    </label>
  )
}

function catalogoDe(estados: Opcion[], empresas: Opcion[], proyectos: Opcion[], tipos: Opcion[], areas: Opcion[], solicitantes: Opcion[]) {
  return {
    status: new Map(estados.map((item) => [item.value, item.label])),
    team: new Map([["DESARROLLO", "Desarrollo"], ["MARKETING", "Marketing"]]),
    priority: new Map(Object.entries(PRIORITY_LABEL)),
    empresa: new Map(empresas.map((item) => [item.value, item.label])),
    brand: new Map([["CIFES", "CIFES"], ["LUVANIA", "Luvania"], ["AMBAS", "Ambas/Transversal"]]),
    area: new Map(areas.map((item) => [item.value, item.label])),
    proyecto: new Map(proyectos.map((item) => [item.value, item.label])),
    tipo: new Map(tipos.map((item) => [item.value, item.label])),
    solicitante: new Map(solicitantes.map((item) => [item.value, item.label])),
  }
}

function pillsActivas(params: { get: (key: string) => string | null }, catalogo: ReturnType<typeof catalogoDe>) {
  const claves = ["status", "team", "priority", "empresa", "brand", "area", "proyecto", "tipo", "solicitante", "from", "to"] as const
  const nombres: Record<string, string> = {
    status: "Estado", team: "Equipo", priority: "Prioridad", empresa: "Empresa", brand: "Marca", area: "Área", proyecto: "Proyecto", tipo: "Tipo", solicitante: "Solicitante", from: "Desde", to: "Hasta",
  }
  return claves.flatMap((clave) => {
    const valor = params.get(clave)
    if (!valor) return []
    const mapa = clave in catalogo ? catalogo[clave as keyof typeof catalogo] : null
    const visible = mapa?.get(valor) ?? (clave === "status" ? statusLabel(valor) : valor)
    return [{ clave, texto: `${nombres[clave]}: ${visible}` }]
  })
}

function etiquetaEstado(status: string) {
  if (status === "APROBADO") return "En cola"
  if (status === "EN_REVISION_BRIEF" || status === "EN_REVISION_INTERNA") return "En revisión"
  return statusLabel(status)
}

function fechaLista(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: ZONE,
  }).format(new Date(iso))
}
