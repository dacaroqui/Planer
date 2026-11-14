const CERRADOS = new Set(["CERRADO", "RECHAZADO", "CANCELADO"])

export type Avance = {
  hechas: number
  total: number
  porcentaje: number
  fuente: "tareas" | "requerimientos" | "estado" | "vacio"
}

export type TareaConSubtareas = { status: string; subtareas?: { status: string }[] }

export function porcentajeTarea(tarea: TareaConSubtareas) {
  const subtareas = tarea.subtareas ?? []
  if (subtareas.length > 0) {
    const hechas = subtareas.filter((item) => item.status === "HECHA").length
    return Math.round((hechas / subtareas.length) * 100)
  }
  return tarea.status === "HECHA" ? 100 : 0
}

export function avanceDeTareas(tareas: { status: string }[]): Avance | null {
  if (tareas.length === 0) return null
  const hechas = tareas.filter((tarea) => tarea.status === "HECHA").length
  return {
    hechas,
    total: tareas.length,
    porcentaje: Math.round((hechas / tareas.length) * 100),
    fuente: "tareas",
  }
}

export function avanceRequerimiento(tareas: { id?: string; status: string; parentId?: string | null }[], status: string): Avance {
  if (tareas.every((tarea) => typeof tarea.id === "string")) {
    return avanceDesdeLista(tareas as { id: string; status: string; parentId?: string | null }[], status)
  }
  const raices = tareas.filter((tarea) => !tarea.parentId)
  if (raices.length > 0) {
    const porcentajes = raices.map((tarea) => porcentajeTarea(tarea))
    return {
      hechas: porcentajes.filter((valor) => valor === 100).length,
      total: raices.length,
      porcentaje: Math.round(porcentajes.reduce((suma, valor) => suma + valor, 0) / porcentajes.length),
      fuente: "tareas",
    }
  }
  const cerrado = CERRADOS.has(status)
  return { hechas: cerrado ? 1 : 0, total: 1, porcentaje: cerrado ? 100 : 0, fuente: "estado" }
}

export function agruparTareas<T extends { id: string; status: string; parentId?: string | null }>(tareas: T[]) {
  const raices = tareas.filter((tarea) => !tarea.parentId)
  return raices.map((tarea) => ({
    ...tarea,
    subtareas: tareas.filter((item) => item.parentId === tarea.id),
  }))
}

export function avanceDesdeLista(tareas: { id: string; status: string; parentId?: string | null }[], status: string): Avance {
  const grupos = agruparTareas(tareas)
  if (grupos.length === 0) {
    const cerrado = CERRADOS.has(status)
    return { hechas: cerrado ? 1 : 0, total: 1, porcentaje: cerrado ? 100 : 0, fuente: "estado" }
  }
  const porcentajes = grupos.map((tarea) => porcentajeTarea(tarea))
  return {
    hechas: porcentajes.filter((valor) => valor === 100).length,
    total: grupos.length,
    porcentaje: Math.round(porcentajes.reduce((suma, valor) => suma + valor, 0) / porcentajes.length),
    fuente: "tareas",
  }
}

export function avanceProyecto(input: {
  tareas: TareaConSubtareas[]
  requerimientos: { status: string }[]
}): Avance {
  if (input.tareas.length > 0) {
    const porcentajes = input.tareas.map((tarea) => porcentajeTarea(tarea))
    return {
      hechas: porcentajes.filter((valor) => valor === 100).length,
      total: input.tareas.length,
      porcentaje: Math.round(porcentajes.reduce((suma, valor) => suma + valor, 0) / porcentajes.length),
      fuente: "tareas",
    }
  }
  const total = input.requerimientos.length
  if (total === 0) return { hechas: 0, total: 0, porcentaje: 0, fuente: "vacio" }
  const hechas = input.requerimientos.filter((item) => CERRADOS.has(item.status)).length
  return {
    hechas,
    total,
    porcentaje: Math.round((hechas / total) * 100),
    fuente: "requerimientos",
  }
}

export function tareaVencida(tarea: { status: string; dueDate: Date | null }, ahora = new Date()) {
  return tarea.status !== "HECHA" && tarea.dueDate !== null && tarea.dueDate.getTime() < ahora.getTime()
}
