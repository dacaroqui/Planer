import { describe, expect, it } from "vitest"
import { ajustarRedireccion, cookieSegura, urlDeLogin } from "@/lib/auth-host"

describe("H-06 sesión detrás de proxy", () => {
  it("no manda localhost al túnel y marca Secure solo en https", () => {
    expect(ajustarRedireccion("localhost:3000", "http", "https://tunel.ejemplo.com/panel")).toBe("http://localhost:3000/panel")
    expect(cookieSegura("https")).toBe(true)
    expect(cookieSegura("http")).toBe(false)
    expect(cookieSegura("https,http")).toBe(true)
    expect(urlDeLogin("localhost:3000", "http", "/panel")).toBe("http://localhost:3000/login?callbackUrl=%2Fpanel")
    expect(urlDeLogin("localhost:3000, tunel.ejemplo.com", "http", "/tablero")).not.toContain("tunel")
  })
})
