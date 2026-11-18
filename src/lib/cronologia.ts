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

export function adjuntoVisible(veInternas: boolean, kind: string | null) {
  if (!kind) return true
  if (veInternas) return true
  return esTipoComentario(kind) && esEntradaPublica(kind)
}

export function esImagenAdjunto(mime: string, nombre: string) {
  if (mime.startsWith("image/")) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(nombre)
}

export function visibilidadDefecto(nombre: string): "publica" | "interna" {
  if (nombre === "Pedir información" || nombre.startsWith("Entregar")) return "publica"
  return "interna"
}

export function notaResolucionOpcional(movimiento: { name?: string; to?: string }) {
  return Boolean(movimiento.name?.startsWith("Entregar") || movimiento.to === "CERRADO" || movimiento.to === "RECHAZADO" || movimiento.to === "CANCELADO" || movimiento.to === "CERRADO_GANADO" || movimiento.to === "CERRADO_PERDIDO" || movimiento.to === "IMPLEMENTADA" || movimiento.to === "DESCARTADA")
}

export function esPorResponder(
  fila: { requesterId: string; lastPublicActorId: string | null },
  actorId?: string,
) {
  if (actorId && fila.lastPublicActorId === actorId) return false
  return !fila.lastPublicActorId || fila.lastPublicActorId === fila.requesterId
}

export function pestanasPara(input: { esSolicitante: boolean; puedePublica: boolean; puedeNota: boolean }) {
  if (input.esSolicitante && input.puedeNota) return ["INTERNA", "REGISTRO"] as const
  if (input.esSolicitante) return input.puedePublica ? (["PUBLICA"] as const) : ([] as const)
  const pestanas: Array<"PUBLICA" | "INTERNA" | "REGISTRO" | "SOLICITUD_INFO"> = []
  if (input.puedePublica) pestanas.push("PUBLICA")
  if (input.puedeNota) pestanas.push("INTERNA", "REGISTRO", "SOLICITUD_INFO")
  return pestanas
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
