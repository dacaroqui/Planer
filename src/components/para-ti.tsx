"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, IconoTipo } from "@/components/iconos-planer"
import { EstadoVacio } from "@/components/estado-vacio"
import { enUltimaSemana, tiempoRelativo } from "@/lib/planer-ui"

export type ItemParaTi = {
  code: string
  title: string
  tipo: string
  espacio: string
  espacioId: string
  asignado: string | null
  marca: string
  actualizado: string
  assigneeId: string | null
  href?: string
  pedido?: string | null
}

const TABS = [
  { id: "asignaciones", label: "Mis asignaciones" },
  { id: "reciente", label: "Trabajo reciente" },
  { id: "marcado", label: "Marcado" },
  { id: "visto", label: "Visto" },
] as const

const VACIO: Record<(typeof TABS)[number]["id"], { titulo: string; texto: string }> = {
  asignaciones: {
    titulo: "No tienes asignaciones pendientes ahora",
    texto: "Cuando te asignen un requerimiento o una tarea, aparecerá aquí.",
  },
  reciente: {
    titulo: "Aún no hay actividad reciente",
    texto: "El trabajo de tu equipo aparecerá aquí cuando haya movimiento.",
  },
  marcado: {
    titulo: "No has marcado nada como favorito",
    texto: "La estrella de una fila lo deja en esta pestaña.",
  },
  visto: {
    titulo: "Todavía no has abierto ningún requerimiento",
    texto: "Los que abras desde aquí quedan en esta pestaña.",
  },
}

export function ParaTi({
  actorId,
  espacios,
  items,
  tabInicial,
  puedeBandeja = false,
  ahoraIso,
}: {
  actorId: string
  espacios: { id: string; name: string }[]
  items: ItemParaTi[]
  tabInicial?: string
  puedeBandeja?: boolean
  ahoraIso?: string
}) {
  const [tab, setTab] = useState(tabInicial && TABS.some((item) => item.id === tabInicial) ? tabInicial : "reciente")
  const [marcados, setMarcados] = useState<string[]>([])
  const [vistos, setVistos] = useState<string[]>([])
  useEffect(() => {
    setMarcados(leer("planer-marcados"))
    setVistos(leer("planer-vistos"))
  }, [])
  const ahora = ahoraIso ? new Date(ahoraIso) : new Date()
  const semana = items.filter((item) => enUltimaSemana(new Date(item.actualizado), ahora))
  const antes = items.filter((item) => !enUltimaSemana(new Date(item.actualizado), ahora))
  const visibles = tab === "asignaciones"
    ? items.filter((item) => item.assigneeId === actorId)
    : tab === "marcado"
      ? items.filter((item) => marcados.includes(item.code))
      : tab === "visto"
        ? items.filter((item) => vistos.includes(item.code))
        : items
  const cuenta = items.filter((item) => item.assigneeId === actorId).length
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Para ti</h1>
      </div>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Espacios recomendados</h2>
          <Link href="/proyectos" className="text-sm text-[#1658B0] hover:underline">Ver todos los espacios</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {espacios.slice(0, 3).map((espacio) => (
            <Link key={espacio.id} href={`/espacios/${espacio.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 hover:border-[#1658B0]">
              <span className="inline-flex size-10 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ background: espacio.name.toLowerCase().includes("luvania") ? "#EE876B" : "#1658B0" }}>{espacio.name.slice(0, 1)}</span>
              <span>
                <span className="block font-medium">{espacio.name}</span>
                <span className="text-xs text-muted-foreground">Espacio empresarial</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`border-b-2 px-3 py-2 text-sm ${tab === item.id ? "border-[#1658B0] font-medium text-[#1658B0]" : "border-transparent text-muted-foreground"}`}>
            {item.label}
            {item.id === "asignaciones" && cuenta > 0 ? <span className="ml-2 rounded bg-[#1658B0] px-1.5 text-[11px] text-white">{cuenta}</span> : null}
          </button>
        ))}
      </div>
      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={VACIO[tab as keyof typeof VACIO].titulo}
          texto={VACIO[tab as keyof typeof VACIO].texto}
          accion={tab === "asignaciones" && puedeBandeja ? <Link href="/bandeja" className="text-sm font-medium text-[#1658B0] hover:underline">Ir a la bandeja de respuesta</Link> : null}
        />
      ) : (
        <>
          <Grupo titulo="En la última semana" items={visibles.filter((item) => semana.includes(item))} marcados={marcados} onMarcar={(code) => guardarMarca(code, marcados, setMarcados)} ahora={ahora} />
          <Grupo titulo="Antes" items={visibles.filter((item) => antes.includes(item))} marcados={marcados} onMarcar={(code) => guardarMarca(code, marcados, setMarcados)} ahora={ahora} />
        </>
      )}
    </div>
  )
}

function Grupo({ titulo, items, marcados, onMarcar, ahora }: { titulo: string; items: ItemParaTi[]; marcados: string[]; onMarcar: (code: string) => void; ahora: Date }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 text-sm text-muted-foreground">{titulo}</h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">
        {items.map((item) => (
          <li key={item.code} className="flex items-center gap-3 px-3 py-2.5">
            <button type="button" aria-label={marcados.includes(item.code) ? "Quitar de marcados" : "Marcar"} className={marcados.includes(item.code) ? "text-[#EE876B]" : "text-muted-foreground"} onClick={() => onMarcar(item.code)}>★</button>
            <IconoTipo nombre={item.tipo} />
            <Link href={item.href ?? `/requerimientos/${item.code}`} className="min-w-0 flex-1" onClick={() => recordarVisto(item.pedido || item.code)}>
              <span className="flex items-center gap-2 truncate font-medium text-[#1658B0] hover:underline">
                {item.pedido ? <span className="rounded-full bg-[#E7F0FB] px-2 py-0.5 text-[11px] font-medium">{item.pedido}</span> : null}
                <span className="truncate">{item.title}</span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">{item.tipo} · {item.pedido ? "Tarea" : item.code} · {item.espacio}</span>
            </Link>
            {item.asignado ? <Avatar nombre={item.asignado} marca={item.marca} /> : <span className="text-xs text-muted-foreground">Sin asignar</span>}
            <time className="w-24 text-right text-xs text-muted-foreground" dateTime={item.actualizado}>{tiempoRelativo(new Date(item.actualizado), ahora)}</time>
          </li>
        ))}
      </ul>
    </section>
  )
}

function leer(clave: string) {
  try {
    const valor = JSON.parse(localStorage.getItem(clave) || "[]")
    return Array.isArray(valor) ? valor.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function guardarMarca(code: string, actual: string[], set: (valor: string[]) => void) {
  const siguiente = actual.includes(code) ? actual.filter((item) => item !== code) : [code, ...actual].slice(0, 40)
  localStorage.setItem("planer-marcados", JSON.stringify(siguiente))
  set(siguiente)
}

function recordarVisto(code: string) {
  const actual = leer("planer-vistos")
  localStorage.setItem("planer-vistos", JSON.stringify([code, ...actual.filter((item) => item !== code)].slice(0, 40)))
}
