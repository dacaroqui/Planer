import { describe, expect, it } from "vitest"
import { validarClave } from "@/lib/clave"
import { cuentaBloqueada, hashToken, registrarFallo, registroPublicoHabilitado } from "@/lib/cuentas"
import { isInternalEmail } from "@/lib/time"

describe("RQ-52 a RQ-56 reglas de acceso", () => {
  it("bloquea al quinto intento y no antes", () => {
    const ahora = new Date("2026-11-17T15:00:00.000Z")
    const cuarto = registrarFallo(3, ahora)
    expect(cuarto.lockedUntil).toBeNull()
    expect(cuarto.failedAttempts).toBe(4)
    const quinto = registrarFallo(4, ahora)
    expect(quinto.failedAttempts).toBe(5)
    expect(cuentaBloqueada(quinto.lockedUntil, ahora)).toBe(true)
    expect(cuentaBloqueada(quinto.lockedUntil, new Date(ahora.getTime() + 16 * 60 * 1000))).toBe(false)
  })

  it("exige una contraseña distinta del correo y de al menos 8 caracteres", () => {
    expect(validarClave("corta", "ana@cifes.edu.co")).toMatch(/8 caracteres/)
    expect(validarClave("ana@cifes.edu.co", "ana@cifes.edu.co")).toMatch(/correo/)
    expect(validarClave("clave-segura", "ana@cifes.edu.co")).toBeNull()
  })

  it("acepta varios dominios y deja el registro propio apagado", () => {
    expect(isInternalEmail("ana@luvania.com", "cifes.edu.co,luvania.com")).toBe(true)
    expect(isInternalEmail("ana@gmail.com", "cifes.edu.co,luvania.com")).toBe(false)
    const previo = process.env.REGISTRO_PUBLICO
    delete process.env.REGISTRO_PUBLICO
    expect(registroPublicoHabilitado()).toBe(false)
    process.env.REGISTRO_PUBLICO = "true"
    expect(registroPublicoHabilitado()).toBe(true)
    if (previo === undefined) delete process.env.REGISTRO_PUBLICO
    else process.env.REGISTRO_PUBLICO = previo
  })

  it("guarda el enlace como hash y no como el token", () => {
    const token = "abc"
    expect(hashToken(token)).not.toBe(token)
    expect(hashToken(token)).toBe(hashToken(token))
  })
})
