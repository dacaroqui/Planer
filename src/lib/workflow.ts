import type { RoleName, TeamName } from "@/lib/domain"
import { STATUS_LABEL } from "@/lib/domain"

export type TransitionWhen = "requiresApproval" | "noApproval"

export type Transition = {
  from: string
  to: string
  teams: TeamName[]
  roles: RoleName[]
  label: string
  requiresComment: boolean
  ownerOnly: boolean
  when?: TransitionWhen
}

const dev: TeamName[] = ["DESARROLLO"]
const mkt: TeamName[] = ["MARKETING"]
const team: RoleName[] = ["AGENTE", "LIDER", "ADMINISTRADOR"]
const lead: RoleName[] = ["LIDER", "ADMINISTRADOR"]

function edge(
  from: string,
  to: string,
  teams: TeamName[],
  roles: RoleName[],
  label: string,
  extra: Partial<Pick<Transition, "requiresComment" | "ownerOnly" | "when">> = {},
): Transition {
  return {
    from,
    to,
    teams,
    roles,
    label,
    requiresComment: extra.requiresComment ?? false,
    ownerOnly: extra.ownerOnly ?? false,
    when: extra.when,
  }
}

export const TRANSITIONS: Transition[] = [
  edge("RADICADO", "EN_ANALISIS", dev, team, "Tomar para análisis"),
  edge("RADICADO", "CANCELADO", dev, ["SOLICITANTE", "LIDER", "ADMINISTRADOR"], "Cancelar", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("EN_ANALISIS", "PENDIENTE_INFORMACION", dev, team, "Pedir información", { requiresComment: true }),
  edge("EN_ANALISIS", "PENDIENTE_APROBACION", dev, team, "Enviar a aprobación", { when: "requiresApproval" }),
  edge("EN_ANALISIS", "EN_DESARROLLO", dev, team, "Pasar a desarrollo", { when: "noApproval" }),
  edge("EN_ANALISIS", "CANCELADO", dev, lead, "Cancelar", { requiresComment: true }),
  edge("PENDIENTE_INFORMACION", "EN_ANALISIS", dev, ["SOLICITANTE", ...team], "Entregar información", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("PENDIENTE_APROBACION", "APROBADO", dev, lead, "Aprobar"),
  edge("PENDIENTE_APROBACION", "DEVUELTO", dev, lead, "Devolver", { requiresComment: true }),
  edge("PENDIENTE_APROBACION", "CANCELADO", dev, lead, "Cancelar", { requiresComment: true }),
  edge("DEVUELTO", "EN_ANALISIS", dev, team, "Retomar análisis"),
  edge("DEVUELTO", "CANCELADO", dev, ["SOLICITANTE", ...team], "Cancelar", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("APROBADO", "EN_DESARROLLO", dev, team, "Iniciar desarrollo"),
  edge("EN_DESARROLLO", "EN_PRUEBAS", dev, team, "Enviar a pruebas"),
  edge("EN_DESARROLLO", "PENDIENTE_INFORMACION", dev, team, "Pedir información", { requiresComment: true }),
  edge("EN_PRUEBAS", "RESUELTO", dev, team, "Marcar resuelto", { requiresComment: true }),
  edge("EN_PRUEBAS", "EN_DESARROLLO", dev, team, "Volver a desarrollo"),
  edge("RESUELTO", "CERRADO", dev, ["SOLICITANTE", ...team], "Cerrar", { ownerOnly: true }),
  edge("RESUELTO", "EN_DESARROLLO", dev, ["SOLICITANTE", ...team], "Reabrir", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("CERRADO", "EN_ANALISIS", dev, ["ADMINISTRADOR"], "Reabrir", { requiresComment: true }),

  edge("RADICADO", "EN_REVISION", mkt, team, "Tomar para revisión"),
  edge("RADICADO", "CANCELADO", mkt, ["SOLICITANTE", "LIDER", "ADMINISTRADOR"], "Cancelar", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("EN_REVISION", "PENDIENTE_BRIEF", mkt, team, "Pedir brief", { requiresComment: true }),
  edge("EN_REVISION", "PENDIENTE_APROBACION", mkt, team, "Enviar a aprobación", { when: "requiresApproval" }),
  edge("EN_REVISION", "EN_PRODUCCION", mkt, team, "Iniciar producción", { when: "noApproval" }),
  edge("EN_REVISION", "CANCELADO", mkt, lead, "Cancelar", { requiresComment: true }),
  edge("PENDIENTE_BRIEF", "EN_REVISION", mkt, ["SOLICITANTE", ...team], "Entregar brief", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("PENDIENTE_APROBACION", "APROBADO", mkt, lead, "Aprobar"),
  edge("PENDIENTE_APROBACION", "DEVUELTO", mkt, lead, "Devolver", { requiresComment: true }),
  edge("PENDIENTE_APROBACION", "CANCELADO", mkt, lead, "Cancelar", { requiresComment: true }),
  edge("DEVUELTO", "EN_REVISION", mkt, team, "Retomar revisión"),
  edge("DEVUELTO", "CANCELADO", mkt, ["SOLICITANTE", ...team], "Cancelar", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("APROBADO", "EN_PRODUCCION", mkt, team, "Iniciar producción"),
  edge("EN_PRODUCCION", "EN_APROBACION_PIEZA", mkt, team, "Enviar pieza a aprobación"),
  edge("EN_APROBACION_PIEZA", "ENTREGADO", mkt, ["SOLICITANTE", "LIDER", "ADMINISTRADOR"], "Aceptar entrega", {
    ownerOnly: true,
  }),
  edge("EN_APROBACION_PIEZA", "EN_AJUSTES", mkt, ["SOLICITANTE", "LIDER", "ADMINISTRADOR"], "Pedir ajustes", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("EN_AJUSTES", "EN_PRODUCCION", mkt, team, "Retomar producción"),
  edge("ENTREGADO", "CERRADO", mkt, ["SOLICITANTE", ...team], "Cerrar", { ownerOnly: true }),
  edge("ENTREGADO", "EN_AJUSTES", mkt, ["SOLICITANTE", "LIDER", "ADMINISTRADOR"], "Reabrir", {
    requiresComment: true,
    ownerOnly: true,
  }),
  edge("CERRADO", "EN_REVISION", mkt, ["ADMINISTRADOR"], "Reabrir", { requiresComment: true }),
]

export function transicionesDelEstado(team: TeamName, status: string, requiresApproval: boolean) {
  return TRANSITIONS.filter((transition) => {
    if (transition.from !== status || !transition.teams.includes(team)) return false
    if (transition.when === "requiresApproval" && !requiresApproval) return false
    if (transition.when === "noApproval" && requiresApproval) return false
    return true
  })
}

export function etiquetaEstado(status: string) {
  return STATUS_LABEL[status] ?? status
}

export function estadosConocidos() {
  return Object.keys(STATUS_LABEL)
}
