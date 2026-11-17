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
  if ((move.requiresComment || movimientoCierra(move)) && comment.trim().length < 2) return "Escriba el motivo. Queda en el historial."
  if (movimientoCierra(move) && !comment.trim()) return "Escriba un comentario antes de cerrar."
  if (move.requiresDelivery && deliveryUrl.trim().length > 0 && deliveryUrl.trim().length < 4) return "El enlace de la entrega no es válido."
  return null
}
