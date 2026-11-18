import type { SlaState } from "@/lib/domain"

export type PiezaParaTi = {
  code: string
  title: string
  tipo: string
  espacio: string
  asignado: string | null
  marca: string
  actualizado: string
  assigneeId: string | null
  estado: string
  estadoEtiqueta: string
  sla: SlaState | null
  href: string
}

const ESTADO_TAREA: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  HECHA: "Hecha",
}

export function etiquetaTarea(estado: string) {
  return ESTADO_TAREA[estado] ?? estado
}

export function combinarAsignaciones(requerimientos: PiezaParaTi[], tareas: PiezaParaTi[]) {
  return [...requerimientos, ...tareas].sort((a, b) => b.actualizado.localeCompare(a.actualizado))
}
