export const ROLES = ["SOLICITANTE", "AGENTE", "LIDER", "ADMINISTRADOR", "OBSERVADOR"] as const
export const TEAMS = ["DESARROLLO", "MARKETING"] as const
export const BRANDS = ["CIFES", "LUVANIA", "AMBAS"] as const
export const PRIORITIES = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const

export type RoleName = (typeof ROLES)[number]
export type TeamName = (typeof TEAMS)[number]
export type BrandName = (typeof BRANDS)[number]
export type PriorityName = (typeof PRIORITIES)[number]

export type Actor = {
  id: string
  email: string
  name: string
  role: RoleName
  team: TeamName | null
  areaId: string
  active: boolean
}

export const ROLE_LABEL: Record<RoleName, string> = {
  SOLICITANTE: "Solicitante",
  AGENTE: "Agente",
  LIDER: "Líder de área",
  ADMINISTRADOR: "Administrador",
  OBSERVADOR: "Observador",
}

export const TEAM_LABEL: Record<TeamName, string> = {
  DESARROLLO: "Desarrollo",
  MARKETING: "Marketing",
}

export const BRAND_LABEL: Record<BrandName, string> = {
  CIFES: "CIFES",
  LUVANIA: "Luvania",
  AMBAS: "Ambas marcas",
}

export const PRIORITY_LABEL: Record<PriorityName, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
}

export const STATUS_LABEL: Record<string, string> = {
  RADICADO: "Radicado",
  EN_ANALISIS: "En análisis",
  PENDIENTE_INFORMACION: "Pendiente de información",
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  DEVUELTO: "Devuelto",
  APROBADO: "Aprobado",
  EN_DESARROLLO: "En desarrollo",
  EN_PRUEBAS: "En pruebas",
  RESUELTO: "Resuelto",
  EN_REVISION: "En revisión",
  PENDIENTE_BRIEF: "Pendiente de brief",
  EN_PRODUCCION: "En producción",
  EN_APROBACION_PIEZA: "En aprobación de pieza",
  EN_AJUSTES: "En ajustes",
  ENTREGADO: "Entregado",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
}

export const SLA_LABEL = {
  A_TIEMPO: "A tiempo",
  EN_RIESGO: "En riesgo",
  VENCIDO: "Vencido",
  EN_PAUSA: "En pausa",
  CUMPLIDO: "Cumplido",
  INCUMPLIDO: "Incumplido",
  NO_APLICA: "No aplica",
} as const

export type SlaState = keyof typeof SLA_LABEL

export const PAUSE_STATUSES = new Set(["PENDIENTE_INFORMACION", "PENDIENTE_BRIEF"])
export const RESOLVED_STATUSES = new Set(["RESUELTO", "ENTREGADO"])
export const TERMINAL_STATUSES = new Set(["CERRADO", "CANCELADO"])
export const DONE_STATUSES = new Set(["RESUELTO", "ENTREGADO", "CERRADO", "CANCELADO"])

export function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DomainError"
  }
}
