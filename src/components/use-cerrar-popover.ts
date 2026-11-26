import { useEffect, useRef } from "react"

export function useCerrarPopover(abierto: boolean, cerrar: () => void) {
  const caja = useRef<HTMLElement | null>(null)
  const disparador = useRef<HTMLButtonElement | null>(null)
  const cerrarRef = useRef(cerrar)
  cerrarRef.current = cerrar
  useEffect(() => {
    if (!abierto) return
    function fuera(event: MouseEvent) {
      const nodo = event.target as Node
      if (caja.current?.contains(nodo) || disparador.current?.contains(nodo)) return
      cerrarRef.current()
    }
    function tecla(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      cerrarRef.current()
      disparador.current?.focus()
    }
    document.addEventListener("mousedown", fuera)
    document.addEventListener("keydown", tecla)
    return () => {
      document.removeEventListener("mousedown", fuera)
      document.removeEventListener("keydown", tecla)
    }
  }, [abierto])
  return { caja, disparador }
}
