import { describe, expect, it, vi } from "vitest"
import { publicarComposicion } from "@/components/compositor-envio"

describe("publicar un comentario desde el compositor", () => {
  it("resetea el formulario capturado y refresca, aunque React ya haya anulado currentTarget", async () => {
    const form = { reset: vi.fn() }
    const evento = { currentTarget: form as { reset: () => void } | null }
    const capturado = evento.currentTarget
    evento.currentTarget = null
    const refrescar = vi.fn()
    const avisos: string[] = []
    const ok = await publicarComposicion({
      form: capturado!,
      data: new FormData(),
      comentar: async () => ({ ok: true, message: "Publicado." }),
      avisar: (tipo, texto) => avisos.push(`${tipo}:${texto}`),
      refrescar,
    })
    expect(ok).toBe(true)
    expect(evento.currentTarget).toBeNull()
    expect(form.reset).toHaveBeenCalledOnce()
    expect(refrescar).toHaveBeenCalledOnce()
    expect(avisos).toEqual(["ok:Publicado."])
  })

  it("si la publicación falla, conserva el texto y no refresca la vista", async () => {
    const form = { reset: vi.fn() }
    const refrescar = vi.fn()
    const avisos: string[] = []
    const data = new FormData()
    data.append("archivo", new File(["demo"], "nota.png", { type: "image/png" }))
    const ok = await publicarComposicion({
      form,
      data,
      comentar: async (enviado) => {
        expect(enviado.getAll("archivo")).toHaveLength(1)
        return { ok: false, error: "No se pudo publicar." }
      },
      avisar: (tipo, texto) => avisos.push(`${tipo}:${texto}`),
      refrescar,
    })
    expect(ok).toBe(false)
    expect(form.reset).not.toHaveBeenCalled()
    expect(refrescar).not.toHaveBeenCalled()
    expect(avisos).toEqual(["error:No se pudo publicar."])
  })
})
