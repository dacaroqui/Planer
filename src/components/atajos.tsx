"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

function enCampo(target: EventTarget | null) {
  const elemento = target as HTMLElement | null
  if (!elemento) return false
  const etiqueta = elemento.tagName
  return etiqueta === "INPUT" || etiqueta === "TEXTAREA" || etiqueta === "SELECT" || elemento.isContentEditable
}

export function Atajos() {
  const router = useRouter()
  useEffect(() => {
    let previo = ""
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || enCampo(event.target)) return
      if (event.key === "?") {
        router.push("/ayuda")
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
      if (previo === "g" && event.key === "b") router.push("/tablero")
      if (previo === "g" && event.key === "l") router.push("/requerimientos")
      previo = event.key
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])
  return null
}
