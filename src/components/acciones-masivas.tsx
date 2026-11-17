"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { prioridadMasivaAction } from "@/server/actions"
import { Button } from "@/components/ui/button"

export function AccionesMasivas({ codes }: { codes: string[] }) {
  const router = useRouter()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [pending, start] = useTransition()
  if (codes.length === 0) return null
  return (
    <form className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("codes", elegidos.join(","))
      start(async () => {
        const result = await prioridadMasivaAction(data)
        if (!result.ok) toast.error(result.error)
        else {
          toast.success(result.message || "Prioridad actualizada.")
          setElegidos([])
          router.refresh()
        }
      })
    }}>
      <fieldset className="grid max-h-28 gap-1 overflow-auto text-sm">
        <legend className="text-xs text-muted-foreground">Cambiar prioridad de varios</legend>
        {codes.map((code) => (
          <label key={code} className="flex items-center gap-2">
            <input type="checkbox" checked={elegidos.includes(code)} onChange={(event) => setElegidos((prev) => event.target.checked ? [...prev, code] : prev.filter((item) => item !== code))} />
            {code}
          </label>
        ))}
      </fieldset>
      <select name="priority" aria-label="Nueva prioridad" className="h-9 rounded-lg border border-input px-2 text-sm" defaultValue="MEDIA">
        <option value="BAJA">Baja</option>
        <option value="MEDIA">Media</option>
        <option value="ALTA">Alta</option>
        <option value="CRITICA">Crítica</option>
      </select>
      <Button type="submit" disabled={pending || elegidos.length === 0}>Aplicar</Button>
    </form>
  )
}
