import { describe, expect, it } from "vitest"
import { esSemillaDemo } from "@/lib/semilla-modo"

describe("semilla inicial", () => {
  it("no carga la demostración salvo SEED_DEMO=true", () => {
    expect(esSemillaDemo({})).toBe(false)
    expect(esSemillaDemo({ SEED_DEMO: "false" })).toBe(false)
    expect(esSemillaDemo({ SEED_DEMO: "true" })).toBe(true)
  })
})
