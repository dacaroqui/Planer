import { describe, expect, it } from "vitest"
import { pareceDatoPersonal } from "@/lib/datos-personales"

describe("RQ-06 datos personales", () => {
  it("detecta cédula y celular y deja pasar códigos y años", () => {
    expect(pareceDatoPersonal("La cédula 1020304050 no debe ir aquí")).toBe(true)
    expect(pareceDatoPersonal("Llamar al 3104567890")).toBe(true)
    expect(pareceDatoPersonal("Revisar DES-0042 del año 2026")).toBe(false)
  })
})
