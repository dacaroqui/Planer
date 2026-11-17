import { describe, expect, it } from "vitest"
import { origenesPermitidos } from "@/lib/origenes"

describe("orígenes de server actions detrás de proxy", () => {
  it("toma el host de APP_URL y AUTH_URL y admite comodines", () => {
    expect(origenesPermitidos({
      APP_URL: "https://mesa.ejemplo.com",
      AUTH_URL: "https://mesa.ejemplo.com/",
      ALLOWED_ORIGINS: "*.trycloudflare.com, localhost:3000",
    })).toEqual([
      "mesa.ejemplo.com",
      "*.trycloudflare.com",
      "localhost:3000",
    ])
  })

  it("conserva el puerto cuando la URL pública no es el puerto por defecto", () => {
    expect(origenesPermitidos({ APP_URL: "https://mesa.ejemplo.com:8443" })).toEqual(["mesa.ejemplo.com:8443"])
  })
})
