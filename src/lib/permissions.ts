import type { Actor, TeamName } from "@/lib/domain"
import { TERMINAL_STATUSES } from "@/lib/domain"
import { TRANSICIONES_OFICIALES, type TransicionOficial } from "@/lib/flujo-oficial"

export type RequestAccess = {
  id: string
  team: TeamName
  status: string
  requesterId: string
  assigneeId: string | null
  resolvedAt?: Date | null
}

export function esAdmin(actor: Actor) {
  return actor.active && actor.isAdmin
}

export function rolEn(actor: Actor, team: TeamName) {
  if (!actor.active) return null
  const roles = actor.memberships.filter((item) => item.team === team).map((item) => item.role)
  if (roles.includes("LIDER")) return "LIDER" as const
  if (roles.includes("AGENTE")) return "AGENTE" as const
  if (roles.includes("OBSERVADOR")) return "OBSERVADOR" as const
  return null
}

export function puedeVer(actor: Actor, request: { team: TeamName; requesterId: string }) {
  if (!actor.active) return false
  if (esAdmin(actor)) return true
  if (request.requesterId === actor.id) return true
  return rolEn(actor, request.team) !== null
}

export function esObservadorPuro(actor: Actor) {
  return actor.active
    && !esAdmin(actor)
    && actor.memberships.length > 0
    && actor.memberships.every((item) => item.role === "OBSERVADOR")
}

export function puedeRadicar(actor: Actor) {
  return actor.active && !esObservadorPuro(actor)
}

export function puedeVerPlanner(actor: Actor) {
  if (!actor.active) return false
  if (esAdmin(actor)) return true
  return actor.memberships.some((item) => item.role === "AGENTE" || item.role === "LIDER")
}

export function equiposVisibles(actor: Actor) {
  if (esAdmin(actor)) return ["DESARROLLO", "MARKETING"] as const
  return [...new Set(actor.memberships.map((item) => item.team))]
}

export function puedeVerNotaInterna(actor: Actor, team: TeamName) {
  if (esAdmin(actor)) return true
  const rol = rolEn(actor, team)
  return rol === "AGENTE" || rol === "LIDER"
}

export function puedeComentar(
  actor: Actor,
  request: { team: TeamName; status: string; requesterId: string },
  internal: boolean,
) {
  if (!actor.active || !puedeVer(actor, request)) return false
  const rol = rolEn(actor, request.team)
  const propio = actor.id === request.requesterId
  if (internal) return esAdmin(actor) || rol === "AGENTE" || rol === "LIDER"
  if (rol === "OBSERVADOR" && !propio && !esAdmin(actor)) return false
  if (esAdmin(actor) || rol === "AGENTE" || rol === "LIDER" || propio) return true
  return false
}

export function puedeAdjuntar(actor: Actor, request: { team: TeamName; status: string; requesterId: string }) {
  if (!puedeVer(actor, request) || TERMINAL_STATUSES.has(request.status)) return false
  if (esAdmin(actor)) return true
  if (actor.id === request.requesterId) return true
  const rol = rolEn(actor, request.team)
  return rol === "AGENTE" || rol === "LIDER"
}

export function puedeAsignar(actor: Actor, request: { team: TeamName; status: string }) {
  if (TERMINAL_STATUSES.has(request.status)) return false
  if (esAdmin(actor)) return true
  return rolEn(actor, request.team) === "LIDER"
}

export function puedeAutoasignarse(actor: Actor, request: { team: TeamName; status: string }, permitido: boolean) {
  if (!permitido || TERMINAL_STATUSES.has(request.status)) return false
  return rolEn(actor, request.team) === "AGENTE"
}

export function puedeAdministrar(actor: Actor) {
  return esAdmin(actor)
}

export function puedeEditarCampos(
  actor: Actor,
  request: { team: TeamName; status: string; requesterId: string },
) {
  if (!puedeVer(actor, request) || TERMINAL_STATUSES.has(request.status)) return false
  if (esAdmin(actor)) return true
  if (rolEn(actor, request.team) === "LIDER") return true
  return actor.id === request.requesterId && request.status === "NUEVO"
}

export function puedeCambiarPrioridad(actor: Actor, team: TeamName) {
  return esAdmin(actor) || rolEn(actor, team) === "LIDER"
}

export function puedeTrasladar(actor: Actor, team: TeamName) {
  return esAdmin(actor) || rolEn(actor, team) === "LIDER"
}

function rolPermitido(actor: Actor, request: RequestAccess, roles: TransicionOficial["roles"]) {
  if (esAdmin(actor)) return true
  const rol = rolEn(actor, request.team)
  if (roles.includes("LIDER") && rol === "LIDER") return true
  if (roles.includes("SOLICITANTE") && actor.id === request.requesterId) return true
  if (roles.includes("RESPONSABLE") && request.assigneeId && actor.id === request.assigneeId && rol === "AGENTE") {
    return true
  }
  if (roles.includes("QA")) {
    if (rol === "LIDER") return true
    if (rol === "AGENTE" && actor.id !== request.assigneeId) return true
  }
  return false
}

export function transicionesPara(
  actor: Actor,
  request: RequestAccess,
  catalogo = TRANSICIONES_OFICIALES,
  now = new Date(),
) {
  return catalogo.filter((transition) => {
    if (transition.team !== request.team) return false
    if (!transition.from.includes(request.status)) return false
    if (transition.reopenWithinDays && request.resolvedAt) {
      const limite = request.resolvedAt.getTime() + transition.reopenWithinDays * 24 * 60 * 60 * 1000
      if (now.getTime() > limite && !esAdmin(actor)) return false
    }
    return rolPermitido(actor, request, transition.roles)
  })
}

export function encontrarTransicion(
  actor: Actor,
  request: RequestAccess,
  name: string,
  catalogo = TRANSICIONES_OFICIALES,
  now = new Date(),
) {
  return transicionesPara(actor, request, catalogo, now).find((item) => item.name === name) ?? null
}
