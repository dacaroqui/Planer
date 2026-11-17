export const VENTANA_RECIENTE_MS = 7 * 24 * 60 * 60 * 1000

export function enUltimaSemana(fecha: Date, ahora = new Date()) {
  return ahora.getTime() - fecha.getTime() <= VENTANA_RECIENTE_MS && fecha.getTime() <= ahora.getTime()
}

export function tiempoRelativo(fecha: Date, ahora = new Date()) {
  const delta = Math.max(0, ahora.getTime() - fecha.getTime())
  const minutos = Math.floor(delta / 60000)
  if (minutos < 1) return "ahora"
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return dias === 1 ? "hace 1 día" : `hace ${dias} días`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`
}

export type IconoTipo = "error" | "pieza" | "subtarea" | "tarea" | "requerimiento"

export function iconoTipo(nombre: string, subtarea = false): IconoTipo {
  if (subtarea) return "subtarea"
  const texto = nombre.toLowerCase()
  if (texto.includes("error") || texto.includes("bug")) return "error"
  if (texto.includes("pieza") || texto.includes("gráfica") || texto.includes("grafica")) return "pieza"
  if (texto.includes("tarea")) return "tarea"
  return "requerimiento"
}

export type IconoPrioridad = "critica" | "alta" | "media" | "baja"

export function iconoPrioridad(prioridad: string): IconoPrioridad {
  if (prioridad === "CRITICA") return "critica"
  if (prioridad === "ALTA") return "alta"
  if (prioridad === "BAJA") return "baja"
  return "media"
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  const letras = (partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")
  return (letras || "?").toUpperCase()
}
