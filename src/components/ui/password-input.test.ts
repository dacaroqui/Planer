import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PasswordInput, etiquetaVisibilidad } from "@/components/ui/password-input"

describe("PasswordInput", () => {
  it("alterna la etiqueta del ojo", () => {
    expect(etiquetaVisibilidad(false)).toBe("Mostrar contraseña")
    expect(etiquetaVisibilidad(true)).toBe("Ocultar contraseña")
  })

  it("empieza oculta, con un botón de teclado que no envía el formulario", () => {
    const html = renderToStaticMarkup(createElement(PasswordInput, { id: "password", name: "password", autoComplete: "current-password" }))
    expect(html).toContain('type="password"')
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Mostrar contraseña"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('id="password"')
    expect(html).toContain('name="password"')
    expect(html).not.toContain("Ocultar contraseña")
  })
})
