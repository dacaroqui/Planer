import type { Actor, TeamName } from "@/lib/domain"
import { TERMINAL_STATUSES } from "@/lib/domain"
import { esPorResponder } from "@/lib/cronologia"
import { esAdmin, puedeAsignar, puedeComentar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { evaluarSla } from "@/server/requests"

export type TabBandeja = "responder" | "sin-asignar" | "mios" | "espera" | "vencer"

export type FiltroBandeja = {
  tab: TabBandeja
  equipo?: TeamName
  empresaId?: string
  prioridad?: string
  responsable?: string
  soloMios?: boolean
}

const TABS: TabBandeja[] = ["responder", "sin-asignar", "mios", "espera", "vencer"]

export function tabBandeja(valor: string | undefined): TabBandeja {
  return TABS.includes(valor as TabBandeja) ? valor as TabBandeja : "responder"
}

export function puedeEntrarBandeja(actor: Actor) {
  if (!actor.active) return false
  if (esAdmin(actor)) return true
  return actor.memberships.some((item) => item.role === "AGENTE" || item.role === "LIDER" || item.role === "OBSERVADOR")
}

export function puedeEscribirBandeja(actor: Actor) {
  if (!actor.active) return false
  if (esAdmin(actor)) return true
  return actor.memberships.some((item) => item.role === "AGENTE" || item.role === "LIDER")
}

export async function listarBandeja(actor: Actor, filtros: FiltroBandeja) {
  const equipos = esAdmin(actor)
    ? (["DESARROLLO", "MARKETING"] as TeamName[])
    : [...new Set(actor.memberships.map((item) => item.team))]
  const equiposFiltrados = filtros.equipo && equipos.includes(filtros.equipo) ? [filtros.equipo] : equipos
  const filas = await prisma.request.findMany({
    where: {
      status: { notIn: [...TERMINAL_STATUSES] },
      ...(equiposFiltrados.length ? { team: { in: equiposFiltrados } } : { id: "ninguno" }),
      ...(filtros.empresaId ? { empresaId: filtros.empresaId } : {}),
      ...(filtros.prioridad ? { priority: filtros.prioridad } : {}),
      ...(filtros.responsable ? { assigneeId: filtros.responsable } : {}),
      ...(filtros.soloMios ? { assigneeId: actor.id } : {}),
    },
    include: {
      requester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      lastPublicActor: { select: { id: true, name: true } },
      empresa: { select: { id: true, name: true } },
      pauses: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 250,
  })
  const decoradas = filas.map((fila) => {
    const sla = evaluarSla(fila)
    return { fila, sla }
  }).sort((a, b) => a.sla.remainingMinutes - b.sla.remainingMinutes || a.fila.code.localeCompare(b.fila.code, "es"))
  const coincide = (tab: TabBandeja, item: (typeof decoradas)[number]) => {
    if (tab === "responder") return esPorResponder({ requesterId: item.fila.requesterId, lastPublicActorId: item.fila.lastPublicActorId })
    if (tab === "sin-asignar") return !item.fila.assigneeId
    if (tab === "mios") return item.fila.assigneeId === actor.id
    if (tab === "espera") return item.fila.status === "EN_ESPERA"
    return item.sla.state === "VENCIDO" || item.sla.state === "EN_RIESGO" || (item.sla.remainingMinutes > 0 && item.sla.remainingMinutes <= 30)
  }
  const conteos = Object.fromEntries(TABS.map((tab) => [tab, decoradas.filter((item) => coincide(tab, item)).length])) as Record<TabBandeja, number>
  const visibles = decoradas.filter((item) => coincide(filtros.tab, item)).slice(0, 80)
  return {
    conteos,
    soloLectura: !puedeEscribirBandeja(actor),
    filas: visibles.map(({ fila, sla }) => ({
      code: fila.code,
      title: fila.title,
      requester: fila.requester.name,
      lastActor: fila.lastPublicActor?.name ?? "Sin respuesta pública",
      lastAt: fila.lastPublicAt?.toISOString() ?? null,
      sla: sla.state,
      assignee: fila.assignee?.name ?? "Sin asignar",
      assigneeId: fila.assigneeId,
      team: fila.team,
      puedeAsignar: puedeAsignar(actor, fila),
      puedeResponder: puedeComentar(actor, fila, false),
    })),
    empresas: [...new Map(filas.map((fila) => [fila.empresa.id, fila.empresa])).values()],
    responsables: [...new Map(filas.flatMap((fila) => fila.assignee ? [[fila.assignee.id, fila.assignee] as const] : [])).values()],
  }
}
