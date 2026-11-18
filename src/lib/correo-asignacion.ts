import { correoSmtpActivo } from "@/lib/email"

/** El correo de asignación solo sale con SMTP configurado. Los tests pueden forzar el proveedor. */
export function correoAsignacionHabilitado(opciones?: { forzar?: boolean }) {
  if (opciones?.forzar) return true
  if (process.env.NOTIFICAR_CORREO_ASIGNACION === "0") return false
  return correoSmtpActivo()
}
