import type { Actor, RoleName, TeamName } from "@/lib/domain"
import { DONE_STATUSES, TERMINAL_STATUSES } from "@/lib/domain"
import { transicionesDelEstado, type Transition } from "@/lib/workflow"

export type RequestAccess = {
  id: string
  team: TeamName
  status: string
  requesterId: string
  requiresApproval: boolean
}

function onDestinationTeam(actor: Actor, team: TeamName) {
  return (actor.role === "AGENTE" || actor.role === "LIDER") && actor.team === team
}

export function puedeRadicar(actor: Actor) {
  return actor.active && actor.role !== "OBSERVADOR"
}

export function puedeVerNotaInterna(actor: Actor, team: TeamName) {
  if (!actor.active) return false
  if (actor.role === "ADMINISTRADOR" || actor.role === "OBSERVADOR") return true
  return onDestinationTeam(actor, team)
}

export function puedeComentar(actor: Actor, request: { team: TeamName; status: string; requesterId: string }, internal: boolean) {
  if (!actor.active || actor.role === "OBSERVADOR") return false
  if (TERMINAL_STATUSES.has(request.status)) return false
  if (actor.role === "ADMINISTRADOR") return true
  const teamMember = onDestinationTeam(actor, request.team)
  if (internal) return teamMember
  return teamMember || actor.id === request.requesterId
}

export function puedeAdjuntar(actor: Actor, request: { team: TeamName; status: string; requesterId: string }) {
  return puedeComentar(actor, request, false)
}

export function puedeAsignar(actor: Actor, request: { team: TeamName; status: string }) {
  if (!actor.active || TERMINAL_STATUSES.has(request.status)) return false
  if (actor.role === "ADMINISTRADOR") return true
  return onDestinationTeam(actor, request.team)
}

export function puedeAdministrar(actor: Actor) {
  return actor.active && actor.role === "ADMINISTRADOR"
}

export function encontrarTransicion(actor: Actor, request: RequestAccess, to: string): Transition | null {
  if (!actor.active) return null
  const candidates = transicionesDelEstado(request.team, request.status, request.requiresApproval)
  const transition = candidates.find((item) => item.to === to)
  if (!transition) return null
  if (!transition.roles.includes(actor.role as RoleName)) return null
  if (actor.role === "SOLICITANTE") {
    if (!transition.ownerOnly || actor.id !== request.requesterId) return null
  }
  if ((actor.role === "AGENTE" || actor.role === "LIDER") && actor.team !== request.team) return null
  return transition
}

export function transicionesPara(actor: Actor, request: RequestAccess) {
  return transicionesDelEstado(request.team, request.status, request.requiresApproval).filter(
    (transition) => encontrarTransicion(actor, request, transition.to)?.to === transition.to,
  )
}

export function esAbierto(status: string) {
  return !DONE_STATUSES.has(status)
}
