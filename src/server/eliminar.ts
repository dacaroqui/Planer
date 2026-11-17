import type { Actor } from "@/lib/domain"
import { puedeAdministrar } from "@/lib/permissions"

export const MENSAJE_ELIMINAR = "No tiene permiso para eliminar. Solo un administrador puede hacerlo."

export function rechazoEliminar(actor: Actor): { ok: false; error: string; status: 403 } | null {
  if (puedeAdministrar(actor)) return null
  return { ok: false, error: MENSAJE_ELIMINAR, status: 403 }
}
