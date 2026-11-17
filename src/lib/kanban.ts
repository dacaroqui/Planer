export const COLUMNAS_KANBAN = ["Por hacer", "En progreso", "En revisión", "Hecho"] as const
export type ColumnaKanban = (typeof COLUMNAS_KANBAN)[number]

export function columnaDeEstado(estado: { category: string; key: string; name: string }): ColumnaKanban {
  if (estado.category === "TERMINADO") return "Hecho"
  if (estado.category === "POR_HACER") return "Por hacer"
  const texto = `${estado.key} ${estado.name}`.toUpperCase()
  if (/REVIS|VALID|PRUEB|APROB/.test(texto)) return "En revisión"
  return "En progreso"
}

export function transicionHaciaColumna(
  moves: { name: string; to: string; requiresComment?: boolean; requiresDelivery?: boolean }[],
  estados: { key: string; category: string; name: string }[],
  columna: string,
) {
  const validas = moves.filter((move) => {
    const estado = estados.find((item) => item.key === move.to)
    return Boolean(estado && columnaDeEstado(estado) === columna)
  })
  if (validas.length === 0) return { ok: false as const, error: "Esa columna no es un movimiento permitido para su rol. La tarjeta vuelve a su lugar." }
  const simple = validas.find((move) => !move.requiresComment && !move.requiresDelivery && move.to !== "CERRADO" && move.to !== "RECHAZADO" && move.to !== "CANCELADO")
  return { ok: true as const, move: simple ?? validas[0] }
}

export type GrupoTablero = "ninguno" | "asignado" | "prioridad" | "area"

export function claveGrupo(item: { asignado: string; priority: string; area: string }, grupo: GrupoTablero) {
  if (grupo === "asignado") return item.asignado || "Sin asignar"
  if (grupo === "prioridad") return item.priority
  if (grupo === "area") return item.area || "Sin área"
  return "Todos"
}
