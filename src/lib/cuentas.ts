import { createHash, randomBytes } from "node:crypto"

export const INTENTOS_MAXIMOS = 5
export const BLOQUEO_MINUTOS = 15
export const INVITACION_DIAS = 7
export const RESTABLECIMIENTO_HORAS = 24

export type CodigoIngreso = "ok" | "credenciales" | "bloqueado" | "inactivo" | "pendiente"

export function registroPublicoHabilitado() {
  return process.env.REGISTRO_PUBLICO === "true"
}

export function entraHabilitado() {
  return process.env.AUTH_ENTRA_ENABLED === "true"
}

export function crearToken() {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function venceEnDias(dias: number, ahora = new Date()) {
  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000)
}

export function venceEnHoras(horas: number, ahora = new Date()) {
  return new Date(ahora.getTime() + horas * 60 * 60 * 1000)
}

export function registrarFallo(failedAttempts: number, ahora = new Date()) {
  const next = failedAttempts + 1
  if (next >= INTENTOS_MAXIMOS) {
    return {
      failedAttempts: next,
      lockedUntil: new Date(ahora.getTime() + BLOQUEO_MINUTOS * 60 * 1000),
    }
  }
  return { failedAttempts: next, lockedUntil: null as Date | null }
}

export function cuentaBloqueada(lockedUntil: Date | null, ahora = new Date()) {
  return lockedUntil !== null && lockedUntil.getTime() > ahora.getTime()
}
