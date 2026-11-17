"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { editarCamposAction } from "@/server/actions"
import { Button } from "@/components/ui/button"

export function FormularioClasificar({
  code,
  typeId,
  priority,
  projectId,
  brand,
  committedDate,
  tipos,
  proyectos,
}: {
  code: string
  typeId: string
  priority: string
  projectId: string | null
  brand: string
  committedDate: string
  tipos: { id: string; name: string }[]
  proyectos: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="grid gap-2 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        start(async () => {
          const result = await editarCamposAction(data)
          if (!result.ok) {
            setError(result.error)
            toast.error(result.error)
            return
          }
          setError(null)
          toast.success(result.message || "Clasificación guardada.")
          router.refresh()
        })
      }}
    >
      <input type="hidden" name="code" value={code} />
      <select name="typeId" defaultValue={typeId} className="h-9 rounded-lg border border-input px-2" aria-label="Tipo">
        {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.name}</option>)}
      </select>
      <select name="priority" defaultValue={priority} className="h-9 rounded-lg border border-input px-2" aria-label="Prioridad">
        <option value="CRITICA">Crítica</option>
        <option value="ALTA">Alta</option>
        <option value="MEDIA">Media</option>
        <option value="BAJA">Baja</option>
      </select>
      <select name="projectId" defaultValue={projectId ?? ""} className="h-9 rounded-lg border border-input px-2" aria-label="Proyecto">
        <option value="">Sin proyecto</option>
        {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.name}</option>)}
      </select>
      <select name="brand" defaultValue={brand} className="h-9 rounded-lg border border-input px-2" aria-label="Marca">
        <option value="CIFES">CIFES</option>
        <option value="LUVANIA">Luvania</option>
        <option value="AMBAS">Ambas/Transversal</option>
      </select>
      <input name="committedDate" type="date" lang="es-CO" defaultValue={committedDate} className="h-9 rounded-lg border border-input px-2" aria-label="Fecha comprometida" />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Guardando…" : "Guardar clasificación"}</Button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  )
}
