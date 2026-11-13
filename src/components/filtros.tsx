"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Opcion = { value: string; label: string }

export function Filtros({
  ruta,
  estados,
  mostrarEquipo = true,
}: {
  ruta: string
  estados: Opcion[]
  mostrarEquipo?: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()

  function aplicar(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString())
    if (!valor || valor === "TODOS") next.delete(clave)
    else next.set(clave, valor)
    next.delete("page")
    const query = next.toString()
    router.push(query ? `${ruta}?${query}` : ruta)
  }

  function buscar(formData: FormData) {
    aplicar("q", String(formData.get("q") || "").trim())
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={buscar} className="flex gap-2">
        <Input name="q" defaultValue={params.get("q") ?? ""} placeholder="Buscar por código, título o descripción" />
        <Button type="submit" variant="secondary">
          <SearchIcon />
          Buscar
        </Button>
      </form>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {mostrarEquipo ? (
          <Elegir
            etiqueta="Equipo"
            valor={params.get("team") ?? "TODOS"}
            onChange={(valor) => aplicar("team", valor)}
            opciones={[
              { value: "TODOS", label: "Todos los equipos" },
              { value: "DESARROLLO", label: "Desarrollo" },
              { value: "MARKETING", label: "Marketing" },
            ]}
          />
        ) : null}
        <Elegir
          etiqueta="Estado"
          valor={params.get("status") ?? "TODOS"}
          onChange={(valor) => aplicar("status", valor)}
          opciones={[{ value: "TODOS", label: "Todos los estados" }, ...estados]}
        />
        <Elegir
          etiqueta="Prioridad"
          valor={params.get("priority") ?? "TODOS"}
          onChange={(valor) => aplicar("priority", valor)}
          opciones={[
            { value: "TODOS", label: "Todas las prioridades" },
            { value: "CRITICA", label: "Crítica" },
            { value: "ALTA", label: "Alta" },
            { value: "MEDIA", label: "Media" },
            { value: "BAJA", label: "Baja" },
          ]}
        />
        <Elegir
          etiqueta="Marca"
          valor={params.get("brand") ?? "TODOS"}
          onChange={(valor) => aplicar("brand", valor)}
          opciones={[
            { value: "TODOS", label: "Todas las marcas" },
            { value: "CIFES", label: "CIFES" },
            { value: "LUVANIA", label: "Luvania" },
            { value: "AMBAS", label: "Ambas" },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={params.get("mine") === "1" ? "default" : "outline"} onClick={() => aplicar("mine", params.get("mine") === "1" ? "" : "1")}>
          Solo los míos
        </Button>
        <Button type="button" size="sm" variant={params.get("assigned") === "1" ? "default" : "outline"} onClick={() => aplicar("assigned", params.get("assigned") === "1" ? "" : "1")}>
          Asignados a mí
        </Button>
      </div>
    </div>
  )
}

function Elegir({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string
  valor: string
  opciones: Opcion[]
  onChange: (valor: string) => void
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={etiqueta}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((opcion) => (
          <SelectItem key={opcion.value} value={opcion.value}>{opcion.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
