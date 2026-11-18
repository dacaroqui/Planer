export const TIPOS_COMENTARIO = ["PUBLICA", "INTERNA", "REGISTRO", "SOLICITUD_INFO"] as const
export type TipoComentario = (typeof TIPOS_COMENTARIO)[number]

export function esTipoComentario(valor: string): valor is TipoComentario {
  return (TIPOS_COMENTARIO as readonly string[]).includes(valor)
}

export function internoDe(kind: TipoComentario) {
  return kind === "INTERNA"
}

export function esEntradaPublica(kind: TipoComentario) {
  return kind === "PUBLICA" || kind === "SOLICITUD_INFO"
}

export function visibilidadDefecto(nombre: string): "publica" | "interna" {
  if (nombre === "Pedir información" || nombre.startsWith("Entregar")) return "publica"
  return "interna"
}

export function notaResolucionOpcional(movimiento: { name?: string; to?: string }) {
  return Boolean(movimiento.name?.startsWith("Entregar") || movimiento.to === "CERRADO" || movimiento.to === "RECHAZADO" || movimiento.to === "CANCELADO")
}

export function esPorResponder(fila: { requesterId: string; lastPublicActorId: string | null }) {
  return !fila.lastPublicActorId || fila.lastPublicActorId === fila.requesterId
}

export function puedeRegistrar(actorPuedeNota: boolean, kind: TipoComentario) {
  if (kind === "PUBLICA") return true
  return actorPuedeNota
}

export function horasDeMinutos(minutos: number) {
  return Math.round((minutos / 60) * 100) / 100
}

export function textoHorasTarea(valor: number | null) {
  if (valor === null) return "—"
  return `${valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })} h`
}
