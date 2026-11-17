"use client"

import { useEffect, useState } from "react"
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
  empresas = [],
  proyectos = [],
  tipos = [],
  solicitantes = [],
}: {
  ruta: string
  estados: Opcion[]
  mostrarEquipo?: boolean
  empresas?: Opcion[]
  proyectos?: Opcion[]
  tipos?: Opcion[]
  solicitantes?: Opcion[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [vistas, setVistas] = useState<{ nombre: string; query: string }[]>([])
  useEffect(() => {
    try {
      setVistas(JSON.parse(localStorage.getItem("mesa-vistas") || "[]"))
    } catch {
      setVistas([])
    }
  }, [])

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
        {empresas.length > 0 ? (
          <Elegir etiqueta="Empresa" valor={params.get("empresa") ?? "TODOS"} onChange={(valor) => aplicar("empresa", valor)} opciones={[{ value: "TODOS", label: "Todas las empresas" }, ...empresas]} />
        ) : null}
        {proyectos.length > 0 ? (
          <Elegir etiqueta="Proyecto" valor={params.get("proyecto") ?? "TODOS"} onChange={(valor) => aplicar("proyecto", valor)} opciones={[{ value: "TODOS", label: "Todos los proyectos" }, ...proyectos]} />
        ) : null}
        {tipos.length > 0 ? (
          <Elegir etiqueta="Tipo" valor={params.get("tipo") ?? "TODOS"} onChange={(valor) => aplicar("tipo", valor)} opciones={[{ value: "TODOS", label: "Todos los tipos" }, ...tipos]} />
        ) : null}
        {solicitantes.length > 0 ? (
          <Elegir etiqueta="Solicitante" valor={params.get("solicitante") ?? "TODOS"} onChange={(valor) => aplicar("solicitante", valor)} opciones={[{ value: "TODOS", label: "Todos los solicitantes" }, ...solicitantes]} />
        ) : null}
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
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="date" lang="es-CO" aria-label="Desde" defaultValue={params.get("from") ?? ""} onChange={(event) => aplicar("from", event.target.value)} />
        <Input type="date" lang="es-CO" aria-label="Hasta" defaultValue={params.get("to") ?? ""} onChange={(event) => aplicar("to", event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={params.get("mine") === "1" ? "default" : "outline"} onClick={() => aplicar("mine", params.get("mine") === "1" ? "" : "1")}>
          Solo los míos
        </Button>
        <Button type="button" size="sm" variant={params.get("assigned") === "1" ? "default" : "outline"} onClick={() => aplicar("assigned", params.get("assigned") === "1" ? "" : "1")}>
          Asignados a mí
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => {
          const nombre = window.prompt("Nombre de la vista")
          if (!nombre) return
          const siguientes = [...vistas.filter((item) => item.nombre !== nombre), { nombre, query: params.toString() }]
          localStorage.setItem("mesa-vistas", JSON.stringify(siguientes))
          setVistas(siguientes)
        }}>Guardar vista</Button>
        {vistas.map((vista) => (
          <Button key={vista.nombre} type="button" size="sm" variant="outline" onClick={() => router.push(vista.query ? `${ruta}?${vista.query}` : ruta)}>{vista.nombre}</Button>
        ))}
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
