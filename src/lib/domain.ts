export const ROLES = ["SOLICITANTE", "AGENTE", "LIDER", "ADMINISTRADOR", "OBSERVADOR"] as const
export const TEAMS = ["DESARROLLO", "MARKETING"] as const
export const BRANDS = ["CIFES", "LUVANIA", "AMBAS"] as const
export const PRIORITIES = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const

export type RoleName = (typeof ROLES)[number]
export type TeamName = (typeof TEAMS)[number]
export type BrandName = (typeof BRANDS)[number]
export type PriorityName = (typeof PRIORITIES)[number]

export type Membership = { team: TeamName; role: "AGENTE" | "LIDER" | "OBSERVADOR" }

export type Actor = {
  id: string
  email: string
  name: string
  role: RoleName
  team: TeamName | null
  areaId: string
  active: boolean
  isAdmin: boolean
  memberships: Membership[]
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
  AMBAS: "Ambas/Transversal",
}

export const PRIORITY_LABEL: Record<PriorityName, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
}

export const STATUS_LABEL: Record<string, string> = {
  NUEVO: "Nuevo",
  EN_ANALISIS: "En análisis",
  APROBADO: "Aprobado / En cola",
  EN_ESPERA: "En espera de información",
  EN_DESARROLLO: "En desarrollo",
  BLOQUEADO: "Bloqueado",
  EN_PRUEBAS: "En pruebas (QA)",
  EN_VALIDACION: "En validación del solicitante",
  EN_REVISION_BRIEF: "En revisión de brief",
  EN_PRODUCCION: "En producción",
  EN_REVISION_INTERNA: "En revisión interna",
  EN_APROBACION: "En aprobación del solicitante",
  PROGRAMADO: "Programado / Publicado",
  CERRADO: "Cerrado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
}

export const SLA_LABEL = {
  A_TIEMPO: "A tiempo",
  EN_RIESGO: "Por vencer",
  VENCIDO: "Vencido",
  EN_PAUSA: "En pausa",
  CUMPLIDO: "Cumplido",
  INCUMPLIDO: "Incumplido",
  NO_APLICA: "No aplica",
} as const

export type SlaState = keyof typeof SLA_LABEL

export const PAUSE_STATUSES = new Set(["EN_ESPERA", "EN_VALIDACION", "EN_APROBACION"])
export const RESOLVED_STATUSES = new Set(["CERRADO", "RECHAZADO"])
export const TERMINAL_STATUSES = new Set(["CERRADO", "RECHAZADO", "CANCELADO"])
export const DONE_STATUSES = new Set(["CERRADO", "RECHAZADO", "CANCELADO"])

export function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DomainError"
  }
}
