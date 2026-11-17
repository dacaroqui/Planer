"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const ATAJOS = [
  ["?", "Ver esta lista"],
  ["/", "Buscar por código o título"],
  ["c", "Radicar"],
  ["g luego i", "Panel"],
  ["g luego l", "Lista de requerimientos"],
  ["g luego b", "Tablero"],
  ["g luego p", "Planner"],
  ["g luego h", "Ayuda"],
  ["Esc", "Cerrar esta lista"],
]

function enCampo(target: EventTarget | null) {
  const elemento = target as HTMLElement | null
  if (!elemento) return false
  const etiqueta = elemento.tagName
  return etiqueta === "INPUT" || etiqueta === "TEXTAREA" || etiqueta === "SELECT" || elemento.isContentEditable
}

export function Atajos() {
  const router = useRouter()
  const [abierta, setAbierta] = useState(false)
  useEffect(() => {
    let previo = ""
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbierta(false)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || enCampo(event.target)) return
      if (event.key === "?") {
        event.preventDefault()
        setAbierta(true)
        return
      }
      if (event.key === "/") {
        event.preventDefault()
        document.getElementById("busqueda-global")?.focus()
        return
      }
      if (event.key === "c") {
        router.push("/requerimientos/nuevo")
        return
      }
      if (previo === "g" && event.key === "i") router.push("/panel")
      if (previo === "g" && event.key === "l") router.push("/requerimientos")
      if (previo === "g" && event.key === "b") router.push("/tablero")
      if (previo === "g" && event.key === "p") router.push("/planner")
      if (previo === "g" && event.key === "h") router.push("/ayuda")
      previo = event.key
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])
  return (
    <Dialog open={abierta} onOpenChange={setAbierta}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
        </DialogHeader>
        <ul className="grid gap-2 text-sm">
          {ATAJOS.map(([tecla, accion]) => (
            <li key={tecla} className="flex justify-between gap-4">
              <kbd className="rounded bg-muted px-2 py-0.5">{tecla}</kbd>
              <span>{accion}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
