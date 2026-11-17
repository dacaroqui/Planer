export type EstadoEnlace = "inexistente" | "pendiente" | "aceptada" | "vencida" | "revocada"

export function estadoEnlace(
  row: { usedAt?: Date | null; expiresAt: Date; revokedAt?: Date | null } | null,
  ahora = new Date(),
): EstadoEnlace {
  if (!row) return "inexistente"
  if (row.revokedAt) return "revocada"
  if (row.usedAt) return "aceptada"
  if (row.expiresAt.getTime() < ahora.getTime()) return "vencida"
  return "pendiente"
}

export const MENSAJE_ENLACE: Record<Exclude<EstadoEnlace, "pendiente">, string> = {
  inexistente: "Este enlace no existe. Pida una invitación nueva al administrador.",
  aceptada: "Esta invitación ya fue aceptada. Ingrese con su correo y contraseña.",
  vencida: "Esta invitación venció. Pida una invitación nueva al administrador.",
  revocada: "Esta invitación fue revocada. Pida una invitación nueva al administrador.",
}
