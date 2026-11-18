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
    await publicarComposicion({
      form: capturado!,
      data: new FormData(),
      adjuntar: async () => ({ ok: true }),
      comentar: async () => ({ ok: true, message: "Publicado." }),
      avisar: (tipo, texto) => avisos.push(`${tipo}:${texto}`),
      refrescar,
    })
    expect(evento.currentTarget).toBeNull()
    expect(form.reset).toHaveBeenCalledOnce()
    expect(refrescar).toHaveBeenCalledOnce()
    expect(avisos).toEqual(["ok:Publicado."])
  })

  it("si la publicación falla, conserva el texto y no refresca la vista", async () => {
    const form = { reset: vi.fn() }
    const refrescar = vi.fn()
    const avisos: string[] = []
    await publicarComposicion({
      form,
      data: new FormData(),
      adjuntar: async () => ({ ok: true }),
      comentar: async () => ({ ok: false, error: "No se pudo publicar." }),
      avisar: (tipo, texto) => avisos.push(`${tipo}:${texto}`),
      refrescar,
    })
    expect(form.reset).not.toHaveBeenCalled()
    expect(refrescar).not.toHaveBeenCalled()
    expect(avisos).toEqual(["error:No se pudo publicar."])
  })

  it("no publica el comentario cuando el adjunto falla", async () => {
    const form = { reset: vi.fn() }
    const comentar = vi.fn(async () => ({ ok: true as const, message: "Publicado." }))
    const data = new FormData()
    data.set("archivo", new File(["demo"], "nota.txt", { type: "text/plain" }))
    await publicarComposicion({
      form,
      data,
      adjuntar: async () => ({ ok: false, error: "Archivo no admitido." }),
      comentar,
      avisar: () => {},
      refrescar: () => {},
    })
    expect(comentar).not.toHaveBeenCalled()
    expect(form.reset).not.toHaveBeenCalled()
  })
})
