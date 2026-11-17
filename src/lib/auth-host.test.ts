import { describe, expect, it } from "vitest"
import { ajustarRedireccion, cookieSegura, reescribirSetCookie, urlDeLogin } from "@/lib/auth-host"

describe("H-06 sesión detrás de proxy", () => {
  it("no manda localhost al túnel y marca Secure solo en https", () => {
    expect(ajustarRedireccion("localhost:3000", "http", "https://tunel.ejemplo.com/panel")).toBe("http://localhost:3000/panel")
    expect(cookieSegura("https")).toBe(true)
    expect(cookieSegura("http")).toBe(false)
    expect(cookieSegura("https,http")).toBe(true)
    expect(urlDeLogin("localhost:3000", "http", "/panel")).toBe("http://localhost:3000/login?callbackUrl=%2Fpanel")
    expect(urlDeLogin("localhost:3000, tunel.ejemplo.com", "http", "/tablero")).not.toContain("tunel")
  })

  it("conserva los prefijos __Secure- y __Host- cuando la petición es https", () => {
    const sesion = "__Secure-authjs.session-token=abc; Path=/; HttpOnly; SameSite=Lax; Secure"
    expect(reescribirSetCookie(sesion, "https")).toBe(sesion)
    const csrf = "__Host-authjs.csrf-token=xyz; Path=/; HttpOnly; SameSite=Lax; Secure"
    expect(reescribirSetCookie(csrf, "https")).toBe(csrf)
    const http = reescribirSetCookie(sesion, "http")
    expect(http).toContain("authjs.session-token=")
    expect(http).not.toContain("__Secure-")
    expect(http).not.toMatch(/Secure/i)
  })
})
