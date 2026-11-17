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

export function movimientoExigeDialogo(move: MovimientoTablero) {
  return Boolean(move.requiresComment || move.requiresDelivery)
}

export function validarDatosMovimiento(move: MovimientoTablero, comment: string, deliveryUrl: string) {
  if (move.requiresAssignee) return "Asigne un responsable en el requerimiento antes de mover la tarjeta."
  if (move.requiresCommittedDate) return "Defina la fecha comprometida en el requerimiento antes de mover la tarjeta."
  if (move.requiresComment && comment.trim().length < 2) return "Escriba el motivo. Queda en el historial."
  if (move.requiresDelivery && deliveryUrl.trim().length > 0 && deliveryUrl.trim().length < 4) return "El enlace de la entrega no es válido."
  return null
}
