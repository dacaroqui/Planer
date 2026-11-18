export const CLAVE_HISTORIAL = "planer-historial"

export function registrarHistorial(pila: string[], ruta: string) {
  if (!ruta.startsWith("/") || ruta.startsWith("//")) return pila
  if (pila[pila.length - 1] === ruta) return pila
  return [...pila, ruta].slice(-30)
}

export function decidirVolver(pila: string[], ruta: string, padre: string): { modo: "atras"; pila: string[] } | { modo: "padre"; href: string } {
  const indice = pila.lastIndexOf(ruta)
  if (indice > 0) return { modo: "atras", pila: pila.slice(0, indice) }
  return { modo: "padre", href: padre || "/panel" }
}
