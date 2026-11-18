"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, FilterIcon, RefreshCwIcon } from "lucide-react"

type Opcion = { id: string; name: string; empresaId?: string }

export function ControlesPanel({
  empresas,
  areas,
  proyectos,
}: {
  empresas: Opcion[]
  areas: Opcion[]
  proyectos: Opcion[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [extra, setExtra] = useState(false)
  const [marca, setMarca] = useState(() => Date.now())
  const [texto, setTexto] = useState("Actualizado hace unos instantes")

  useEffect(() => {
    const id = window.setInterval(() => {
      const minutos = Math.floor((Date.now() - marca) / 60000)
      setTexto(minutos < 1 ? "Actualizado hace unos instantes" : `Actualizado hace ${minutos} min`)
    }, 15000)
    return () => window.clearInterval(id)
  }, [marca])

  function ir(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString())
    if (!valor) next.delete(clave)
    else next.set(clave, valor)
    const query = next.toString()
    router.push(query ? `/paneles?${query}` : "/paneles")
  }

  const select = "h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm"
  const empresa = params.get("empresa") ?? ""
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Equipo" className={select} value={params.get("team") ?? ""} onChange={(event) => ir("team", event.target.value)}>
            <option value="">Todos los equipos</option>
            <option value="DESARROLLO">Desarrollo</option>
            <option value="MARKETING">Marketing</option>
          </select>
          <select aria-label="Empresa" className={select} value={empresa} onChange={(event) => ir("empresa", event.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <span className="relative">
            <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <select aria-label="Periodo" className={`${select} pl-9`} value={params.get("periodo") ?? "8s"} onChange={(event) => ir("periodo", event.target.value)}>
              <option value="8s">Últimas 8 semanas</option>
              <option value="mes">Este mes</option>
              <option value="anio">Este año</option>
            </select>
          </span>
          <button type="button" aria-expanded={extra} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm" onClick={() => setExtra((valor) => !valor)}>
            <FilterIcon className="size-4" /> Filtros
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm" onClick={() => { setMarca(Date.now()); setTexto("Actualizado hace unos instantes"); router.refresh() }}>
            <RefreshCwIcon className="size-4" /> Actualizar
          </button>
          <span className="text-xs text-muted-foreground">{texto}</span>
        </div>
      </div>
      {extra ? (
        <div className="grid gap-2 rounded-lg border border-[#E2E8F0] bg-white p-3 sm:grid-cols-3">
          <select aria-label="Marca" className={select} value={params.get("brand") ?? ""} onChange={(event) => ir("brand", event.target.value)}>
            <option value="">Todas las marcas</option>
            <option value="CIFES">CIFES</option>
            <option value="LUVANIA">Luvania</option>
            <option value="AMBAS">Ambas/Transversal</option>
          </select>
          <select aria-label="Área" className={select} value={params.get("area") ?? ""} onChange={(event) => ir("area", event.target.value)}>
            <option value="">Todas las áreas</option>
            {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select aria-label="Proyecto" className={select} value={params.get("proyecto") ?? ""} onChange={(event) => ir("proyecto", event.target.value)}>
            <option value="">Todos los proyectos</option>
            {proyectos.filter((item) => !empresa || item.empresaId === empresa).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  )
}
