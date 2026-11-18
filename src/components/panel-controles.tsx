"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FilterIcon, RefreshCwIcon } from "lucide-react"
import { Elegir } from "@/components/ui/elegir"

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

  const empresa = params.get("empresa") ?? ""
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Elegir className="w-48" ariaLabel="Equipo" value={params.get("team") ?? ""} onValueChange={(valor) => ir("team", valor)} opciones={[{ value: "", label: "Todos los equipos" }, { value: "DESARROLLO", label: "Desarrollo" }, { value: "MARKETING", label: "Marketing" }]} />
          <Elegir className="w-52" ariaLabel="Empresa" value={empresa} onValueChange={(valor) => ir("empresa", valor)} opciones={[{ value: "", label: "Todas las empresas" }, ...empresas.map((item) => ({ value: item.id, label: item.name }))]} />
          <Elegir className="w-52" ariaLabel="Periodo" value={params.get("periodo") ?? "8s"} onValueChange={(valor) => ir("periodo", valor)} opciones={[{ value: "8s", label: "Últimas 8 semanas" }, { value: "mes", label: "Este mes" }, { value: "anio", label: "Este año" }]} />
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
          <Elegir className="w-48" ariaLabel="Marca" value={params.get("brand") ?? ""} onValueChange={(valor) => ir("brand", valor)} opciones={[{ value: "", label: "Todas las marcas" }, { value: "CIFES", label: "CIFES" }, { value: "LUVANIA", label: "Luvania" }, { value: "AMBAS", label: "Ambas/Transversal" }]} />
          <Elegir className="w-48" ariaLabel="Área" value={params.get("area") ?? ""} onValueChange={(valor) => ir("area", valor)} opciones={[{ value: "", label: "Todas las áreas" }, ...areas.map((item) => ({ value: item.id, label: item.name }))]} />
          <Elegir className="w-56" ariaLabel="Proyecto" value={params.get("proyecto") ?? ""} onValueChange={(valor) => ir("proyecto", valor)} opciones={[{ value: "", label: "Todos los proyectos" }, ...proyectos.filter((item) => !empresa || item.empresaId === empresa).map((item) => ({ value: item.id, label: item.name }))]} />
        </div>
      ) : null}
    </div>
  )
}
