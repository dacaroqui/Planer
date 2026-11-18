import { isInternalEmail } from "@/lib/time"

export function evaluarIngreso(
  email: string,
  user: { active: boolean; pendiente?: boolean; deactivatedAt?: Date | null } | null,
  options: { aprovisionar: boolean },
) {
  if (!isInternalEmail(email)) {
    return { ok: false as const, reason: "La cuenta no pertenece a un dominio permitido." }
  }
  if (user && (!user.active || user.deactivatedAt)) {
    return { ok: false as const, reason: "El usuario está inactivo." }
  }
  if (user?.pendiente) {
    return { ok: false as const, reason: "La cuenta está pendiente de aprobación." }
  }
  if (!user && !options.aprovisionar) {
    return { ok: false as const, reason: "El usuario no está registrado en Planer." }
  }
  return { ok: true as const }
}
