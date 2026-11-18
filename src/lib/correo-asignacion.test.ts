import { afterEach, describe, expect, it } from "vitest"
import { correoAsignacionHabilitado } from "@/lib/correo-asignacion"

const claves = ["EMAIL_PROVIDER", "SMTP_HOST", "NOTIFICAR_CORREO_ASIGNACION"] as const

describe("correo de asignación", () => {
  const previo = Object.fromEntries(claves.map((clave) => [clave, process.env[clave]]))
  afterEach(() => {
    for (const clave of claves) {
      if (previo[clave] === undefined) delete process.env[clave]
      else process.env[clave] = previo[clave]
    }
  })

  it("permanece apagado hasta que SMTP está configurado", () => {
    delete process.env.EMAIL_PROVIDER
    delete process.env.SMTP_HOST
    delete process.env.NOTIFICAR_CORREO_ASIGNACION
    expect(correoAsignacionHabilitado()).toBe(false)
    process.env.EMAIL_PROVIDER = "smtp"
    expect(correoAsignacionHabilitado()).toBe(false)
    process.env.SMTP_HOST = "smtp.ejemplo.test"
    expect(correoAsignacionHabilitado()).toBe(true)
    process.env.NOTIFICAR_CORREO_ASIGNACION = "0"
    expect(correoAsignacionHabilitado()).toBe(false)
    expect(correoAsignacionHabilitado({ forzar: true })).toBe(true)
  })
})
