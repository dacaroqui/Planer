import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { cuerpoSinSesion, middlewarePermite } from "@/lib/rutas-publicas"

describe("H-01 las rutas /api no redirigen al login", () => {
  it("deja pasar /api para que la ruta responda 401 en JSON", () => {
    expect(middlewarePermite("/api/adjuntos/abc", false)).toBe(true)
    expect(middlewarePermite("/requerimientos", false)).toBe(false)
    expect(middlewarePermite("/panel", true)).toBe(true)
    expect(cuerpoSinSesion()).toEqual({ error: "Debe iniciar sesión." })
  })

  it("el arranque no importa el servidor de requerimientos", () => {
    const fuente = readFileSync(new URL("../instrumentation.ts", import.meta.url), "utf8")
    expect(fuente).not.toContain("@/server/requests")
    expect(fuente).not.toContain("nodemailer")
    expect(fuente).toContain("/api/cron/sla")
    expect(fuente).toContain("VERCEL")
    expect(fuente).toContain("NETLIFY")
  })
})
