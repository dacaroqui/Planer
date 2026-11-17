"use client"

import { eliminarEstadoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function EliminarEstado({ id, nombre }: { id: string; nombre: string }) {
  return (
    <form action={eliminarEstadoAction} className="flex flex-wrap items-center gap-2 text-sm" onSubmit={(event) => {
      const ok = window.confirm(`Eliminar el estado «${nombre}». Si tiene requerimientos, no se borra: hay que moverlos antes. Esta acción no se puede deshacer.`)
      if (!ok) event.preventDefault()
    }}>
      <input type="hidden" name="id" value={id} />
      <span>{nombre}</span>
      <Input name="moveTo" placeholder="Ya no se usa" className="h-8 w-40" disabled aria-label="Destino, deshabilitado" />
      <Button type="submit" size="sm" variant="outline">Eliminar</Button>
    </form>
  )
}
