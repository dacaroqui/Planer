export const ROLES = ["SOLICITANTE", "AGENTE", "LIDER", "ADMINISTRADOR", "OBSERVADOR"] as const
export const TEAMS = ["DESARROLLO", "MARKETING", "COMERCIAL", "INNOVACION"] as const
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
  COMERCIAL: "Comercial",
  INNOVACION: "Innovación",
}

export const PREFIJO_EQUIPO: Record<TeamName, string> = {
  DESARROLLO: "DES",
  MARKETING: "MKT",
  COMERCIAL: "COM",
  INNOVACION: "INN",
}

export function esTeam(valor: string): valor is TeamName {
  return (TEAMS as readonly string[]).includes(valor)
}

export function estadoInicial(team: TeamName) {
  return team === "INNOVACION" ? "NUEVA_IDEA" : "NUEVO"
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
  EN_VALIDACION_RESULTADOS: "En validación de resultados",
  EN_REVISION_BRIEF: "En revisión de brief",
  EN_PRODUCCION: "En producción",
  EN_REVISION_INTERNA: "En revisión interna",
  EN_APROBACION: "En aprobación del solicitante",
  PROGRAMADO: "Programado / Publicado",
  CERRADO: "Cerrado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
  EN_REVISION: "En revisión",
  EN_COTIZACION: "En cotización/propuesta",
  EN_NEGOCIACION: "En negociación",
  CERRADO_GANADO: "Cerrado ganado",
  CERRADO_PERDIDO: "Cerrado perdido",
  NUEVA_IDEA: "Nueva idea",
  EN_EVALUACION: "En evaluación",
  APROBADA: "Aprobada",
  EN_EXPLORACION: "En exploración/prototipo",
  EN_PILOTO: "En piloto",
  IMPLEMENTADA: "Implementada",
  DESCARTADA: "Descartada",
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

export const PAUSE_STATUSES = new Set(["EN_ESPERA", "EN_VALIDACION", "EN_APROBACION", "EN_VALIDACION_RESULTADOS"])
export const RESOLVED_STATUSES = new Set(["CERRADO", "RECHAZADO"])
export const TERMINAL_STATUSES = new Set(["CERRADO", "RECHAZADO", "CANCELADO", "CERRADO_GANADO", "CERRADO_PERDIDO", "IMPLEMENTADA", "DESCARTADA"])
export const DONE_STATUSES = new Set(["CERRADO", "RECHAZADO", "CANCELADO", "CERRADO_GANADO", "CERRADO_PERDIDO", "IMPLEMENTADA", "DESCARTADA"])

export function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DomainError"
  }
}

export class PermisoDenegado extends DomainError {
  readonly status = 403
  constructor(message = "No tiene permiso para eliminar. Solo un administrador puede hacerlo.") {
    super(message)
    this.name = "PermisoDenegado"
  }
}
