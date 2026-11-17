export function textoEliminar(item: { code?: string | null; title: string }) {
  const titulo = item.title.trim()
  if (item.code) return `Eliminar ${item.code} «${titulo}». No se puede deshacer.`
  return `Eliminar «${titulo}». No se puede deshacer.`
}
