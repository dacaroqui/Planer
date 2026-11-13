import { isInternalEmail } from "@/lib/time"

export function evaluarIngreso(
  email: string,
  user: { active: boolean } | null,
  options: { aprovisionar: boolean },
) {
  if (!isInternalEmail(email)) {
    return { ok: false as const, reason: "La cuenta no pertenece al dominio institucional." }
  }
  if (user && !user.active) {
    return { ok: false as const, reason: "El usuario está inactivo." }
  }
  if (!user && !options.aprovisionar) {
    return { ok: false as const, reason: "El usuario no está registrado en la mesa." }
  }
  return { ok: true as const }
}
