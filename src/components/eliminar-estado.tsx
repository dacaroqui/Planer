"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { eliminarEstadoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"

export function EliminarEstado({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form className="flex flex-wrap items-center gap-2 text-sm" onSubmit={(event) => {
      event.preventDefault()
      const ok = window.confirm(`Eliminar el estado «${nombre}». Si tiene requerimientos, no se borra. Esta acción no se puede deshacer.`)
      if (!ok) return
      const data = new FormData()
      data.set("id", id)
      start(async () => {
        const result = await eliminarEstadoAction(data)
        if (!result.ok) {
          setError(result.error)
          toast.error(result.error)
          return
        }
        setError(null)
        toast.success(result.message || "Estado eliminado.")
        router.refresh()
      })
    }}>
      <span>{nombre}</span>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>Eliminar</Button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  )
}
