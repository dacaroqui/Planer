export function etiquetaMiga(
  parte: string,
  index: number,
  partes: string[],
  nombre: string,
  conocidas: Record<string, string>,
) {
  if (conocidas[parte]) return conocidas[parte]
  if (partes[index - 1] === "espacios" && nombre) return nombre
  if (index === partes.length - 1 && nombre) return nombre
  return decodeURIComponent(parte)
}
