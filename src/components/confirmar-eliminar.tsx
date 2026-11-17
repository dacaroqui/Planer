"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontalIcon } from "lucide-react"
import { toast } from "sonner"
import { eliminarRequerimientoAction, eliminarTareaAction, type ActionResult } from "@/server/actions"
import { textoEliminar } from "@/lib/eliminar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

function DialogoEliminar({
  abierto,
  texto,
  pending,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean
  texto: string
  pending: boolean
  onCerrar: () => void
  onConfirmar: () => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={(valor) => { if (!valor && !pending) onCerrar() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar</DialogTitle>
        </DialogHeader>
        <p className="text-sm">{texto}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={pending}>Cancelar</Button>
          <Button type="button" variant="destructive" onClick={onConfirmar} disabled={pending}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function useEliminacion(accion: () => Promise<ActionResult>, redirigir?: string) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [pending, start] = useTransition()
  function confirmar() {
    start(async () => {
      const result = await accion()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message || "Eliminado.")
      setAbierto(false)
      if (redirigir) router.push(redirigir)
      else router.refresh()
    })
  }
  return { abierto, setAbierto, pending, confirmar }
}

export function EliminarTarea({ id, title, menu = false }: { id: string; title: string; menu?: boolean }) {
  const texto = textoEliminar({ title })
  const flujo = useEliminacion(async () => {
    const data = new FormData()
    data.set("id", id)
    return eliminarTareaAction(data)
  })
  return (
    <>
      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded hover:bg-muted" aria-label={`Menú de ${title}`}>
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => flujo.setAbierto(true)}>Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => flujo.setAbierto(true)}>Eliminar</Button>
      )}
      <DialogoEliminar abierto={flujo.abierto} texto={texto} pending={flujo.pending} onCerrar={() => flujo.setAbierto(false)} onConfirmar={flujo.confirmar} />
    </>
  )
}

export function MenuEliminarRequerimiento({ code, title }: { code: string; title: string }) {
  const texto = textoEliminar({ code, title })
  const flujo = useEliminacion(async () => {
    const data = new FormData()
    data.set("code", code)
    return eliminarRequerimientoAction(data)
  }, "/requerimientos")
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted" aria-label="Más acciones del requerimiento">
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => flujo.setAbierto(true)}>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogoEliminar abierto={flujo.abierto} texto={texto} pending={flujo.pending} onCerrar={() => flujo.setAbierto(false)} onConfirmar={flujo.confirmar} />
    </>
  )
}
