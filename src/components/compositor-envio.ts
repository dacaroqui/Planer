export type ResultadoComposicion = { ok: true; message?: string } | { ok: false; error: string }

// The form has to be captured before the first await. React nulls
// event.currentTarget once the submit handler yields, and reading it
// afterwards throws inside the transition. That throw is what the segment
// error boundary renders as "No se pudo cargar esta vista".
export async function publicarComposicion(input: {
  form: { reset: () => void }
  data: FormData
  adjuntar: (data: FormData) => Promise<ResultadoComposicion>
  comentar: (data: FormData) => Promise<ResultadoComposicion>
  avisar: (tipo: "ok" | "error", texto: string) => void
  refrescar: () => void
}) {
  const archivo = input.data.get("archivo")
  if (archivo instanceof File && archivo.size > 0) {
    const adjunto = await input.adjuntar(input.data)
    if (!adjunto.ok) {
      input.avisar("error", adjunto.error)
      return
    }
  }
  const result = await input.comentar(input.data)
  if (!result.ok) {
    input.avisar("error", result.error)
    return
  }
  input.avisar("ok", result.message || "Publicado.")
  input.form.reset()
  input.refrescar()
}
