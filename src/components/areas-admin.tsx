"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { aplicarPlantillaAreaAction, definirLiderAreaAction, guardarPresentacionAreaAction } from "@/server/actions"
import { Elegir } from "@/components/ui/elegir"

type Equipo = {
  key: string
  name: string
  prefix: string
  description: string
  icon: string
  color: string
  tipos: { id: string; name: string }[]
  estados: { id: string; key: string; name: string }[]
  transiciones: { id: string; name: string; from: string; to: string }[]
  lideres: { id: string; name: string }[]
}

export function AreasAdmin({ equipos, personas }: { equipos: Equipo[]; personas: { id: string; name: string }[] }) {
  const [abierta, setAbierta] = useState(equipos[0]?.key ?? "")
  return (
    <div className="grid gap-3">
      <p className="rounded-lg border border-[#E4E7EC] bg-[#F8FAFD] px-3 py-2 text-sm text-muted-foreground">
        Estas seis áreas viven en el código. Crear otra, distinta de Producto, Marketing, Comercial, Innovación, Administración y Growth, queda para cuando el equipo pase a una tabla.
      </p>
      {equipos.map((equipo) => (
        <section key={equipo.key} className="rounded-xl border border-[#E4E7EC] bg-white">
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={abierta === equipo.key} onClick={() => setAbierta(abierta === equipo.key ? "" : equipo.key)}>
            <span>
              <span className="block font-medium">{equipo.name}</span>
              <span className="text-xs text-muted-foreground">Prefijo {equipo.prefix}- · {equipo.lideres.length} líderes</span>
            </span>
            <span className="text-sm text-[#1658B0]">{abierta === equipo.key ? "Cerrar" : "Editar"}</span>
          </button>
          {abierta === equipo.key ? <Detalle equipo={equipo} personas={personas} /> : null}
        </section>
      ))}
    </div>
  )
}

function Detalle({ equipo, personas }: { equipo: Equipo; personas: { id: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [nombre, setNombre] = useState(equipo.name)
  const [description, setDescription] = useState(equipo.description)
  const [icon, setIcon] = useState(equipo.icon)
  const [color, setColor] = useState(equipo.color)
  const [lider, setLider] = useState("")

  function correr(trabajo: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    start(async () => {
      const result = await trabajo()
      if (!result.ok) toast.error(result.error || "No se pudo guardar.")
      else {
        toast.success(result.message || "Guardado.")
        router.refresh()
      }
    })
  }

  return (
    <div className="grid gap-5 border-t border-[#E4E7EC] px-4 py-4">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData()
        data.set("team", equipo.key)
        data.set("name", nombre)
        data.set("description", description)
        data.set("icon", icon)
        data.set("color", color)
        correr(() => guardarPresentacionAreaAction(data))
      }}>
        <label className="grid gap-1 text-sm">Nombre<input value={nombre} onChange={(event) => setNombre(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] px-3" required /></label>
        <label className="grid gap-1 text-sm">Prefijo del código<input value={`${equipo.prefix}-`} readOnly className="h-10 rounded-lg border border-[#E4E7EC] bg-[#F8FAFD] px-3" aria-readonly="true" /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Icono<input value={icon} onChange={(event) => setIcon(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] px-3" aria-label="Icono" /></label>
        <label className="grid gap-1 text-sm">Color<input value={color} onChange={(event) => setColor(event.target.value)} className="h-10 rounded-lg border border-[#E4E7EC] px-3" aria-label="Color" /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={pending} className="h-10 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white disabled:opacity-50">Guardar área</button></div>
      </form>
      <div>
        <h2 className="text-sm font-semibold">Líderes de {equipo.name}</h2>
        <ul className="mt-2 grid gap-1 text-sm">
          {equipo.lideres.length === 0 ? <li className="text-muted-foreground">Todavía no hay líderes.</li> : equipo.lideres.map((persona) => (
            <li key={persona.id} className="flex items-center justify-between gap-2">
              <span>{persona.name}</span>
              <button type="button" className="text-xs text-red-700 hover:underline" disabled={pending} onClick={() => {
                const data = new FormData()
                data.set("userId", persona.id)
                data.set("team", equipo.key)
                data.set("activo", "0")
                correr(() => definirLiderAreaAction(data))
              }}>Quitar</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Elegir ariaLabel={`Agregar líder de ${equipo.name}`} className="w-64" value={lider} onValueChange={setLider} placeholder="Agregar líder" opciones={[{ value: "", label: "Agregar líder" }, ...personas.filter((persona) => !equipo.lideres.some((item) => item.id === persona.id)).map((persona) => ({ value: persona.id, label: persona.name }))]} />
          <button type="button" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm" disabled={pending || !lider} onClick={() => {
            const data = new FormData()
            data.set("userId", lider)
            data.set("team", equipo.key)
            data.set("activo", "1")
            correr(() => definirLiderAreaAction(data))
          }}>Agregar</button>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Tipos de solicitud</h2>
        <ul className="mt-2 grid gap-1 text-sm">
          {equipo.tipos.length === 0 ? <li className="text-muted-foreground">Sin tipos activos.</li> : equipo.tipos.map((tipo) => <li key={tipo.id}>{tipo.name}</li>)}
        </ul>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Flujo</h2>
        <p className="mt-1 text-xs text-muted-foreground">La plantilla estándar agrega los estados que falten: Nuevo, En análisis, En espera de información, En curso, En revisión, Hecho y Cancelado. No borra el flujo oficial.</p>
        <ul className="mt-2 grid gap-1 text-sm">
          {equipo.estados.map((estado) => <li key={estado.id}>{estado.name} <span className="text-xs text-muted-foreground">{estado.key}</span></li>)}
        </ul>
        <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
          {equipo.transiciones.slice(0, 8).map((paso) => <li key={paso.id}>{paso.name}: {paso.from} → {paso.to}</li>)}
        </ul>
        <button type="button" className="mt-3 h-10 rounded-lg border border-[#1658B0] px-3 text-sm font-medium text-[#1658B0] disabled:opacity-50" disabled={pending} onClick={() => {
          const data = new FormData()
          data.set("team", equipo.key)
          correr(() => aplicarPlantillaAreaAction(data))
        }}>Completar plantilla estándar</button>
      </div>
    </div>
  )
}
