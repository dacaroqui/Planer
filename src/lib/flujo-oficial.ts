import type { TeamName } from "@/lib/domain"

export type EstadoOficial = {
  team: TeamName
  key: string
  name: string
  category: "POR_HACER" | "EN_CURSO" | "TERMINADO"
  sortOrder: number
  boardColumn: string
  hiddenOnBoard?: boolean
}

export type TransicionOficial = {
  team: TeamName
  name: string
  from: string[]
  to: string
  roles: Array<"LIDER" | "RESPONSABLE" | "SOLICITANTE" | "QA">
  requiresComment?: boolean
  requiresAssignee?: boolean
  requiresCommittedDate?: boolean
  requiresDelivery?: boolean
  slaEffect: "STOP_FIRST" | "PAUSE" | "RESUME" | "STOP" | "CONTINUE" | "NEW_CYCLE" | "NONE"
  resolution?: string
  clearResolution?: boolean
  incrementRounds?: boolean
  toPrevious?: boolean
  reopenWithinDays?: number
}

const dev = "DESARROLLO" as const
const mkt = "MARKETING" as const
const com = "COMERCIAL" as const
const inn = "INNOVACION" as const

export const ESTADOS_OFICIALES: EstadoOficial[] = [
  { team: dev, key: "NUEVO", name: "Nuevo", category: "POR_HACER", sortOrder: 10, boardColumn: "Nuevo" },
  { team: dev, key: "EN_ANALISIS", name: "En análisis", category: "EN_CURSO", sortOrder: 20, boardColumn: "En análisis" },
  { team: dev, key: "APROBADO", name: "Aprobado / En cola", category: "POR_HACER", sortOrder: 30, boardColumn: "Aprobado" },
  { team: dev, key: "EN_ESPERA", name: "En espera de información", category: "EN_CURSO", sortOrder: 40, boardColumn: "En análisis" },
  { team: dev, key: "EN_DESARROLLO", name: "En desarrollo", category: "EN_CURSO", sortOrder: 50, boardColumn: "En desarrollo" },
  { team: dev, key: "BLOQUEADO", name: "Bloqueado", category: "EN_CURSO", sortOrder: 60, boardColumn: "En desarrollo" },
  { team: dev, key: "EN_PRUEBAS", name: "En pruebas (QA)", category: "EN_CURSO", sortOrder: 70, boardColumn: "En pruebas" },
  { team: dev, key: "EN_VALIDACION", name: "En validación del solicitante", category: "EN_CURSO", sortOrder: 80, boardColumn: "En validación" },
  { team: dev, key: "CERRADO", name: "Cerrado", category: "TERMINADO", sortOrder: 90, boardColumn: "Cerrado" },
  { team: dev, key: "RECHAZADO", name: "Rechazado", category: "TERMINADO", sortOrder: 100, boardColumn: "Cerrado", hiddenOnBoard: true },
  { team: dev, key: "CANCELADO", name: "Cancelado", category: "TERMINADO", sortOrder: 110, boardColumn: "Cerrado", hiddenOnBoard: true },

  { team: mkt, key: "NUEVO", name: "Nuevo", category: "POR_HACER", sortOrder: 10, boardColumn: "Nuevo" },
  { team: mkt, key: "EN_REVISION_BRIEF", name: "En revisión de brief", category: "EN_CURSO", sortOrder: 20, boardColumn: "Revisión de brief" },
  { team: mkt, key: "APROBADO", name: "Aprobado / En cola", category: "POR_HACER", sortOrder: 30, boardColumn: "Aprobado" },
  { team: mkt, key: "EN_ESPERA", name: "En espera de información", category: "EN_CURSO", sortOrder: 40, boardColumn: "Revisión de brief" },
  { team: mkt, key: "EN_PRODUCCION", name: "En producción", category: "EN_CURSO", sortOrder: 50, boardColumn: "En producción" },
  { team: mkt, key: "EN_REVISION_INTERNA", name: "En revisión interna", category: "EN_CURSO", sortOrder: 60, boardColumn: "Revisión interna" },
  { team: mkt, key: "EN_APROBACION", name: "En aprobación del solicitante", category: "EN_CURSO", sortOrder: 70, boardColumn: "Aprobación del solicitante" },
  { team: mkt, key: "PROGRAMADO", name: "Programado / Publicado", category: "EN_CURSO", sortOrder: 80, boardColumn: "Programado / Publicado" },
  { team: mkt, key: "CERRADO", name: "Cerrado", category: "TERMINADO", sortOrder: 90, boardColumn: "Cerrado" },
  { team: mkt, key: "RECHAZADO", name: "Rechazado", category: "TERMINADO", sortOrder: 100, boardColumn: "Cerrado", hiddenOnBoard: true },
  { team: mkt, key: "CANCELADO", name: "Cancelado", category: "TERMINADO", sortOrder: 110, boardColumn: "Cerrado", hiddenOnBoard: true },

  { team: com, key: "NUEVO", name: "Nuevo", category: "POR_HACER", sortOrder: 10, boardColumn: "Nuevo" },
  { team: com, key: "EN_REVISION", name: "En revisión", category: "EN_CURSO", sortOrder: 20, boardColumn: "En revisión" },
  { team: com, key: "EN_COTIZACION", name: "En cotización/propuesta", category: "EN_CURSO", sortOrder: 30, boardColumn: "En cotización" },
  { team: com, key: "EN_NEGOCIACION", name: "En negociación", category: "EN_CURSO", sortOrder: 40, boardColumn: "En negociación" },
  { team: com, key: "EN_ESPERA", name: "En espera de información", category: "EN_CURSO", sortOrder: 50, boardColumn: "En revisión" },
  { team: com, key: "EN_APROBACION", name: "En aprobación del solicitante", category: "EN_CURSO", sortOrder: 60, boardColumn: "Aprobación del solicitante" },
  { team: com, key: "CERRADO_GANADO", name: "Cerrado ganado", category: "TERMINADO", sortOrder: 70, boardColumn: "Cerrado" },
  { team: com, key: "CERRADO_PERDIDO", name: "Cerrado perdido", category: "TERMINADO", sortOrder: 80, boardColumn: "Cerrado" },
  { team: com, key: "CANCELADO", name: "Cancelado", category: "TERMINADO", sortOrder: 90, boardColumn: "Cerrado", hiddenOnBoard: true },

  { team: inn, key: "NUEVA_IDEA", name: "Nueva idea", category: "POR_HACER", sortOrder: 10, boardColumn: "Nueva idea" },
  { team: inn, key: "EN_EVALUACION", name: "En evaluación", category: "EN_CURSO", sortOrder: 20, boardColumn: "En evaluación" },
  { team: inn, key: "APROBADA", name: "Aprobada", category: "POR_HACER", sortOrder: 30, boardColumn: "Aprobada" },
  { team: inn, key: "EN_ESPERA", name: "En espera de información", category: "EN_CURSO", sortOrder: 40, boardColumn: "En evaluación" },
  { team: inn, key: "EN_EXPLORACION", name: "En exploración/prototipo", category: "EN_CURSO", sortOrder: 50, boardColumn: "En exploración" },
  { team: inn, key: "EN_PILOTO", name: "En piloto", category: "EN_CURSO", sortOrder: 60, boardColumn: "En piloto" },
  { team: inn, key: "EN_VALIDACION_RESULTADOS", name: "En validación de resultados", category: "EN_CURSO", sortOrder: 70, boardColumn: "Validación de resultados" },
  { team: inn, key: "IMPLEMENTADA", name: "Implementada", category: "TERMINADO", sortOrder: 80, boardColumn: "Implementada" },
  { team: inn, key: "DESCARTADA", name: "Descartada", category: "TERMINADO", sortOrder: 90, boardColumn: "Descartada" },
]

export const TRANSICIONES_OFICIALES: TransicionOficial[] = [
  { team: dev, name: "Iniciar análisis", from: ["NUEVO"], to: "EN_ANALISIS", roles: ["LIDER"], slaEffect: "STOP_FIRST" },
  { team: dev, name: "Aprobar", from: ["EN_ANALISIS"], to: "APROBADO", roles: ["LIDER"], requiresAssignee: true, requiresCommittedDate: true, slaEffect: "CONTINUE" },
  { team: dev, name: "Rechazar", from: ["NUEVO", "EN_ANALISIS"], to: "RECHAZADO", roles: ["LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "NO_SE_HARA" },
  { team: dev, name: "Pedir información", from: ["EN_ANALISIS", "APROBADO", "EN_DESARROLLO"], to: "EN_ESPERA", roles: ["RESPONSABLE", "LIDER"], requiresComment: true, slaEffect: "PAUSE" },
  { team: dev, name: "Responder información", from: ["EN_ESPERA"], to: "EN_ESPERA", roles: ["SOLICITANTE", "RESPONSABLE", "LIDER"], toPrevious: true, slaEffect: "RESUME" },
  { team: dev, name: "Iniciar desarrollo", from: ["APROBADO"], to: "EN_DESARROLLO", roles: ["RESPONSABLE", "LIDER"], slaEffect: "CONTINUE" },
  { team: dev, name: "Marcar bloqueado", from: ["EN_DESARROLLO"], to: "BLOQUEADO", roles: ["RESPONSABLE", "LIDER"], requiresComment: true, slaEffect: "CONTINUE" },
  { team: dev, name: "Desbloquear", from: ["BLOQUEADO"], to: "EN_DESARROLLO", roles: ["RESPONSABLE", "LIDER"], slaEffect: "NONE" },
  { team: dev, name: "Enviar a pruebas", from: ["EN_DESARROLLO"], to: "EN_PRUEBAS", roles: ["RESPONSABLE"], requiresComment: true, slaEffect: "NONE" },
  { team: dev, name: "Falla en pruebas", from: ["EN_PRUEBAS"], to: "EN_DESARROLLO", roles: ["QA", "LIDER"], requiresComment: true, slaEffect: "NONE" },
  { team: dev, name: "Entregar para validación", from: ["EN_PRUEBAS"], to: "EN_VALIDACION", roles: ["QA", "LIDER"], requiresComment: true, requiresDelivery: true, slaEffect: "PAUSE" },
  { team: dev, name: "Aprobar entrega", from: ["EN_VALIDACION"], to: "CERRADO", roles: ["SOLICITANTE", "LIDER"], slaEffect: "STOP", resolution: "RESUELTO" },
  { team: dev, name: "Devolver", from: ["EN_VALIDACION"], to: "EN_DESARROLLO", roles: ["SOLICITANTE"], requiresComment: true, slaEffect: "RESUME" },
  { team: dev, name: "Cancelar", from: ["NUEVO", "EN_ANALISIS", "APROBADO"], to: "CANCELADO", roles: ["SOLICITANTE", "LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "CANCELADO_SOLICITANTE" },
  { team: dev, name: "Reabrir", from: ["CERRADO"], to: "EN_ANALISIS", roles: ["LIDER"], requiresComment: true, clearResolution: true, slaEffect: "NEW_CYCLE", reopenWithinDays: 30 },

  { team: mkt, name: "Revisar brief", from: ["NUEVO"], to: "EN_REVISION_BRIEF", roles: ["LIDER"], slaEffect: "STOP_FIRST" },
  { team: mkt, name: "Aprobar y programar", from: ["EN_REVISION_BRIEF"], to: "APROBADO", roles: ["LIDER"], requiresAssignee: true, requiresCommittedDate: true, slaEffect: "CONTINUE" },
  { team: mkt, name: "Rechazar", from: ["NUEVO", "EN_REVISION_BRIEF"], to: "RECHAZADO", roles: ["LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "NO_SE_HARA" },
  { team: mkt, name: "Pedir información", from: ["EN_REVISION_BRIEF", "APROBADO", "EN_PRODUCCION"], to: "EN_ESPERA", roles: ["RESPONSABLE", "LIDER"], requiresComment: true, slaEffect: "PAUSE" },
  { team: mkt, name: "Responder información", from: ["EN_ESPERA"], to: "EN_ESPERA", roles: ["SOLICITANTE", "RESPONSABLE", "LIDER"], toPrevious: true, slaEffect: "RESUME" },
  { team: mkt, name: "Iniciar producción", from: ["APROBADO"], to: "EN_PRODUCCION", roles: ["RESPONSABLE", "LIDER"], slaEffect: "CONTINUE" },
  { team: mkt, name: "Enviar a revisión interna", from: ["EN_PRODUCCION"], to: "EN_REVISION_INTERNA", roles: ["RESPONSABLE"], requiresDelivery: true, slaEffect: "NONE" },
  { team: mkt, name: "Ajustar", from: ["EN_REVISION_INTERNA"], to: "EN_PRODUCCION", roles: ["LIDER"], requiresComment: true, slaEffect: "NONE" },
  { team: mkt, name: "Enviar a aprobación", from: ["EN_REVISION_INTERNA"], to: "EN_APROBACION", roles: ["LIDER"], requiresDelivery: true, slaEffect: "PAUSE" },
  { team: mkt, name: "Solicitar ajustes", from: ["EN_APROBACION"], to: "EN_PRODUCCION", roles: ["SOLICITANTE"], requiresComment: true, incrementRounds: true, slaEffect: "RESUME" },
  { team: mkt, name: "Aprobar pieza", from: ["EN_APROBACION"], to: "PROGRAMADO", roles: ["SOLICITANTE"], slaEffect: "NONE" },
  { team: mkt, name: "Cerrar", from: ["PROGRAMADO"], to: "CERRADO", roles: ["RESPONSABLE", "LIDER"], requiresDelivery: true, slaEffect: "STOP", resolution: "RESUELTO" },
  { team: mkt, name: "Aprobar sin publicación", from: ["EN_APROBACION"], to: "CERRADO", roles: ["SOLICITANTE"], slaEffect: "STOP", resolution: "RESUELTO" },
  { team: mkt, name: "Cancelar", from: ["NUEVO", "EN_REVISION_BRIEF", "APROBADO"], to: "CANCELADO", roles: ["SOLICITANTE", "LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "CANCELADO_SOLICITANTE" },
  { team: mkt, name: "Reabrir", from: ["CERRADO"], to: "EN_REVISION_BRIEF", roles: ["LIDER"], requiresComment: true, clearResolution: true, slaEffect: "NEW_CYCLE", reopenWithinDays: 30 },

  { team: com, name: "Iniciar revisión", from: ["NUEVO"], to: "EN_REVISION", roles: ["LIDER"], slaEffect: "STOP_FIRST" },
  { team: com, name: "Pasar a cotización", from: ["EN_REVISION"], to: "EN_COTIZACION", roles: ["LIDER"], requiresAssignee: true, requiresCommittedDate: true, slaEffect: "CONTINUE" },
  { team: com, name: "Perder", from: ["NUEVO", "EN_REVISION"], to: "CERRADO_PERDIDO", roles: ["LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "NO_SE_HARA" },
  { team: com, name: "Pedir información", from: ["EN_REVISION", "EN_COTIZACION", "EN_NEGOCIACION"], to: "EN_ESPERA", roles: ["RESPONSABLE", "LIDER"], requiresComment: true, slaEffect: "PAUSE" },
  { team: com, name: "Responder información", from: ["EN_ESPERA"], to: "EN_ESPERA", roles: ["SOLICITANTE", "RESPONSABLE", "LIDER"], toPrevious: true, slaEffect: "RESUME" },
  { team: com, name: "Iniciar negociación", from: ["EN_COTIZACION"], to: "EN_NEGOCIACION", roles: ["RESPONSABLE", "LIDER"], slaEffect: "CONTINUE" },
  { team: com, name: "Enviar a aprobación", from: ["EN_NEGOCIACION"], to: "EN_APROBACION", roles: ["RESPONSABLE", "LIDER"], slaEffect: "PAUSE" },
  { team: com, name: "Ganar", from: ["EN_APROBACION"], to: "CERRADO_GANADO", roles: ["SOLICITANTE", "LIDER"], slaEffect: "STOP", resolution: "RESUELTO" },
  { team: com, name: "Cerrar como perdido", from: ["EN_COTIZACION", "EN_NEGOCIACION", "EN_APROBACION"], to: "CERRADO_PERDIDO", roles: ["LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "NO_SE_HARA" },
  { team: com, name: "Cancelar", from: ["NUEVO", "EN_REVISION", "EN_COTIZACION"], to: "CANCELADO", roles: ["SOLICITANTE", "LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "CANCELADO_SOLICITANTE" },
  { team: com, name: "Reabrir", from: ["CERRADO_GANADO", "CERRADO_PERDIDO"], to: "EN_REVISION", roles: ["LIDER"], requiresComment: true, clearResolution: true, slaEffect: "NEW_CYCLE", reopenWithinDays: 30 },

  { team: inn, name: "Evaluar idea", from: ["NUEVA_IDEA"], to: "EN_EVALUACION", roles: ["LIDER"], slaEffect: "STOP_FIRST" },
  { team: inn, name: "Aprobar idea", from: ["EN_EVALUACION"], to: "APROBADA", roles: ["LIDER"], requiresAssignee: true, requiresCommittedDate: true, slaEffect: "CONTINUE" },
  { team: inn, name: "Descartar", from: ["NUEVA_IDEA", "EN_EVALUACION"], to: "DESCARTADA", roles: ["LIDER"], requiresComment: true, slaEffect: "STOP", resolution: "NO_SE_HARA" },
  { team: inn, name: "Pedir información", from: ["EN_EVALUACION", "APROBADA", "EN_EXPLORACION", "EN_PILOTO"], to: "EN_ESPERA", roles: ["RESPONSABLE", "LIDER"], requiresComment: true, slaEffect: "PAUSE" },
  { team: inn, name: "Responder información", from: ["EN_ESPERA"], to: "EN_ESPERA", roles: ["SOLICITANTE", "RESPONSABLE", "LIDER"], toPrevious: true, slaEffect: "RESUME" },
  { team: inn, name: "Iniciar exploración", from: ["APROBADA"], to: "EN_EXPLORACION", roles: ["RESPONSABLE", "LIDER"], slaEffect: "CONTINUE" },
  { team: inn, name: "Pasar a piloto", from: ["EN_EXPLORACION"], to: "EN_PILOTO", roles: ["RESPONSABLE"], requiresComment: true, slaEffect: "NONE" },
  { team: inn, name: "Enviar a validación", from: ["EN_PILOTO"], to: "EN_VALIDACION_RESULTADOS", roles: ["RESPONSABLE", "LIDER"], requiresDelivery: true, slaEffect: "PAUSE" },
  { team: inn, name: "Validar resultados", from: ["EN_VALIDACION_RESULTADOS"], to: "IMPLEMENTADA", roles: ["SOLICITANTE", "LIDER"], slaEffect: "STOP", resolution: "RESUELTO" },
  { team: inn, name: "Devolver", from: ["EN_VALIDACION_RESULTADOS"], to: "EN_PILOTO", roles: ["SOLICITANTE"], requiresComment: true, slaEffect: "RESUME" },
  { team: inn, name: "Reabrir", from: ["IMPLEMENTADA"], to: "EN_EVALUACION", roles: ["LIDER"], requiresComment: true, clearResolution: true, slaEffect: "NEW_CYCLE", reopenWithinDays: 30 },
]

export const PAUSA_SLA = new Set(["EN_ESPERA", "EN_VALIDACION", "EN_APROBACION", "EN_VALIDACION_RESULTADOS"])
export const TERMINALES = new Set(["CERRADO", "RECHAZADO", "CANCELADO", "CERRADO_GANADO", "CERRADO_PERDIDO", "IMPLEMENTADA", "DESCARTADA"])

export const RESOLUCION_LABEL: Record<string, string> = {
  RESUELTO: "Resuelto",
  NO_SE_HARA: "No se hará",
  DUPLICADO: "Duplicado",
  CANCELADO_SOLICITANTE: "Cancelado por el solicitante",
}

export function nombreEstado(team: TeamName, key: string) {
  return ESTADOS_OFICIALES.find((estado) => estado.team === team && estado.key === key)?.name ?? key
}

export const SLA_POR_DEFECTO: Array<{ team: TeamName; priority: string; first: number; resolution: number }> = [
  { team: dev, priority: "CRITICA", first: 2 * 60, resolution: 2 * 8 * 60 },
  { team: dev, priority: "ALTA", first: 4 * 60, resolution: 3 * 8 * 60 },
  { team: dev, priority: "MEDIA", first: 8 * 60, resolution: 5 * 8 * 60 },
  { team: dev, priority: "BAJA", first: 16 * 60, resolution: 10 * 8 * 60 },
  { team: mkt, priority: "CRITICA", first: 4 * 60, resolution: 2 * 8 * 60 },
  { team: mkt, priority: "ALTA", first: 8 * 60, resolution: 3 * 8 * 60 },
  { team: mkt, priority: "MEDIA", first: 16 * 60, resolution: 5 * 8 * 60 },
  { team: mkt, priority: "BAJA", first: 24 * 60, resolution: 10 * 8 * 60 },
  { team: com, priority: "CRITICA", first: 4 * 60, resolution: 2 * 8 * 60 },
  { team: com, priority: "ALTA", first: 8 * 60, resolution: 3 * 8 * 60 },
  { team: com, priority: "MEDIA", first: 16 * 60, resolution: 5 * 8 * 60 },
  { team: com, priority: "BAJA", first: 24 * 60, resolution: 8 * 8 * 60 },
  { team: inn, priority: "CRITICA", first: 8 * 60, resolution: 5 * 8 * 60 },
  { team: inn, priority: "ALTA", first: 16 * 60, resolution: 10 * 8 * 60 },
  { team: inn, priority: "MEDIA", first: 24 * 60, resolution: 15 * 8 * 60 },
  { team: inn, priority: "BAJA", first: 40 * 60, resolution: 20 * 8 * 60 },
]

export const TIPOS_OFICIALES: Array<{ team: TeamName; name: string; description: string; extra: string }> = [
  { team: dev, name: "Nueva funcionalidad", description: "Una capacidad que la plataforma todavía no tiene.", extra: "" },
  { team: dev, name: "Mejora/ajuste", description: "Un cambio sobre algo que ya existe.", extra: "" },
  { team: dev, name: "Error (bug)", description: "Algo que debería funcionar y no lo hace.", extra: "pasos" },
  { team: dev, name: "Soporte o acceso", description: "Acceso, permiso o ayuda para usar un sistema.", extra: "" },
  { team: dev, name: "Datos o reporte", description: "Un informe o una extracción de datos.", extra: "" },
  { team: mkt, name: "Pieza gráfica", description: "Una imagen o pieza para una publicación.", extra: "canal" },
  { team: mkt, name: "Video/audiovisual", description: "Un video o una pieza audiovisual.", extra: "canal" },
  { team: mkt, name: "Campaña o pauta", description: "Una campaña con varias piezas.", extra: "canal" },
  { team: mkt, name: "Publicación en redes", description: "Un texto o una pieza para redes.", extra: "canal" },
  { team: mkt, name: "Contenido web/landing", description: "Una página o un ajuste del sitio.", extra: "canal" },
  { team: mkt, name: "Evento o activación", description: "Una activación o un evento.", extra: "" },
  { team: com, name: "Cotización", description: "Una cotización de productos o servicios.", extra: "" },
  { team: com, name: "Propuesta comercial", description: "Una propuesta para un cliente o aliado.", extra: "" },
  { team: com, name: "Convenio/alianza", description: "Un convenio o una alianza comercial.", extra: "" },
  { team: com, name: "Seguimiento de cliente", description: "El seguimiento de una cuenta o una oportunidad.", extra: "" },
  { team: inn, name: "Idea nueva", description: "Una idea que todavía no está en marcha.", extra: "" },
  { team: inn, name: "Prototipo", description: "Un prototipo para probar la idea.", extra: "" },
  { team: inn, name: "Piloto", description: "Una prueba controlada con un grupo pequeño.", extra: "" },
  { team: inn, name: "Mejora de proceso", description: "Un cambio en la forma de trabajar.", extra: "" },
]
