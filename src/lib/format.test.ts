import { describe, expect, it } from "vitest"
import { formatDateTime, formatoNumero } from "@/lib/format"

describe("fechas en America/Bogota", () => {
  it("arma la fecha con números fijos para que el servidor y el navegador coincidan", () => {
    expect(formatDateTime(new Date("2026-11-18T18:07:00.000Z"))).toBe("18/11/2026 13:07")
    expect(formatDateTime(new Date("2026-11-19T04:59:00.000Z"))).toBe("18/11/2026 23:59")
    expect(formatoNumero(1234567)).toBe("1.234.567")
    expect(formatoNumero(1.5, 1)).toBe("1,5")
  })
})
