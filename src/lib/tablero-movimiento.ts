import { notaResolucionOpcional } from "@/lib/cronologia"

export type MovimientoTablero = {
  name: string
  column: string
  to: string
  requiresComment?: boolean
  requiresDelivery?: boolean
  requiresAssignee?: boolean
  requiresCommittedDate?: boolean
}

export type TarjetaMovible = {
  code: string
  moves: MovimientoTablero[]
}

export function codigoSoltado(guardado: string, transferido: string, codigos: string[]) {
  const candidatos = [guardado, transferido].map((item) => item.trim()).filter(Boolean)
  return candidatos.find((item) => codigos.includes(item)) ?? ""
}

export function movimientoAlSoltar(tarjetas: TarjetaMovible[], code: string, columna: string) {
  const limpio = code.trim()
  const tarjeta = tarjetas.find((item) => item.code === limpio)
  if (!tarjeta) return { ok: false as const, error: "No se identificó la tarjeta arrastrada." }
  const moves = tarjeta.moves.filter((item) => item.column === columna)
  if (moves.length === 0) return { ok: false as const, error: "Esa columna no es una transición permitida para su rol." }
  return { ok: true as const, code: tarjeta.code, moves }
}

export function movimientoCierra(move: { to: string }) {
  return move.to === "CERRADO" || move.to === "RECHAZADO" || move.to === "CANCELADO"
}

export const VENTANA_DESHACER_MS = 20_000

export function dentroDeVentanaDeshacer(creadoEnMs: number, ahoraMs: number) {
  return ahoraMs - creadoEnMs <= VENTANA_DESHACER_MS
}

export function transicionDeDetalle(item: {
  name: string
  to: string
  requiresComment?: boolean
  requiresDelivery?: boolean
  requiresAssignee?: boolean
  requiresCommittedDate?: boolean
}) {
  return {
    name: item.name,
    label: item.name,
    to: item.to,
    requiresComment: Boolean(item.requiresComment),
    requiresDelivery: Boolean(item.requiresDelivery),
    requiresAssignee: Boolean(item.requiresAssignee),
    requiresCommittedDate: Boolean(item.requiresCommittedDate),
  }
}

export function detalleExigeDialogo(
  item: {
    name: string
    to: string
    requiresComment?: boolean
    requiresDelivery?: boolean
    requiresAssignee?: boolean
    requiresCommittedDate?: boolean
  },
  caso: { assigneeId?: string | null; committedDate?: string | null } = {},
) {
  const transicion = transicionDeDetalle(item)
  return movimientoExigeDialogo({
    name: transicion.name,
    column: "",
    to: transicion.to,
    requiresComment: transicion.requiresComment,
    requiresDelivery: transicion.requiresDelivery,
    requiresAssignee: transicion.requiresAssignee,
    requiresCommittedDate: transicion.requiresCommittedDate,
  }) || debePedirResponsable(caso, transicion) || (transicion.requiresCommittedDate && !caso.committedDate)
}

export function avisoTrasMovimiento(ok: boolean, error: string | null) {
  return ok ? null : error
}

export function marcaObligatoria(etiqueta: string) {
  return { etiqueta: `${etiqueta} *`, ariaRequired: true as const }
}

export function tituloConfirmacion(nombre: string) {
  return `Confirmar «${nombre}»`
}

export function camposRequeridos(move: {
  to?: string
  requiresComment?: boolean
  requiresDelivery?: boolean
  requiresAssignee?: boolean
  requiresCommittedDate?: boolean
}) {
  const campos: string[] = []
  if ((move.requiresComment || move.to === "CERRADO" || move.to === "RECHAZADO" || move.to === "CANCELADO") && !notaResolucionOpcional(move)) campos.push("Comentario")
  if (move.requiresDelivery) campos.push("Enlace o adjunto de la entrega")
  if (move.requiresAssignee) campos.push("Responsable")
  if (move.requiresCommittedDate) campos.push("Fecha comprometida")
  return campos
}

export function movimientoExigeDialogo(move: MovimientoTablero) {
  return Boolean(move.requiresComment || move.requiresDelivery || movimientoCierra(move))
}

export function debePedirResponsable(
  tarjeta: { assigneeId?: string | null },
  move: { requiresAssignee?: boolean },
) {
  return Boolean(move.requiresAssignee) && !tarjeta.assigneeId
}

export function debePedirProyecto(
  tarjeta: { status: string; exigeProyecto?: boolean; projectId?: string | null },
  move: { to: string },
) {
  return tarjeta.status === "NUEVO" && Boolean(tarjeta.exigeProyecto) && !tarjeta.projectId && move.to !== "NUEVO" && move.to !== "RECHAZADO" && move.to !== "CANCELADO"
}

export function validarDatosMovimiento(
  move: MovimientoTablero,
  comment: string,
  deliveryUrl: string,
  tarjeta?: { assigneeId?: string | null; committedDate?: string | null },
) {
  if (move.requiresAssignee && !tarjeta?.assigneeId) return "Elija un responsable. El cambio no se aplicó."
  if (move.requiresCommittedDate && !tarjeta?.committedDate) return "Defina la fecha comprometida. El cambio no se aplicó."
  if (!notaResolucionOpcional(move) && (move.requiresComment || movimientoCierra(move)) && comment.trim().length < 2) return "Escriba el motivo. Queda en el historial."
  if (move.requiresDelivery && deliveryUrl.trim().length > 0 && deliveryUrl.trim().length < 4) return "El enlace de la entrega no es válido."
  return null
}
