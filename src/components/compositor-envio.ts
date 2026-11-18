export type ResultadoComposicion = { ok: true; message?: string } | { ok: false; error: string }

// The form has to be captured before the first await. React nulls
// event.currentTarget once the submit handler yields, and reading it
// afterwards throws inside the transition. That throw is what the segment
// error boundary renders as "No se pudo cargar esta vista".
export async function publicarComposicion(input: {
  form: { reset: () => void }
  data: FormData
  comentar: (data: FormData) => Promise<ResultadoComposicion>
  avisar: (tipo: "ok" | "error", texto: string) => void
  refrescar: () => void
}): Promise<boolean> {
  const result = await input.comentar(input.data)
  if (!result.ok) {
    input.avisar("error", result.error)
    return false
  }
  input.avisar("ok", result.message || "Publicado.")
  input.form.reset()
  input.refrescar()
  return true
}
