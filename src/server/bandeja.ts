import { Prisma } from "@prisma/client"
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

const seleccionBandeja = {
  id: true,
  code: true,
  title: true,
  team: true,
  status: true,
  requesterId: true,
  assigneeId: true,
  lastPublicActorId: true,
  lastPublicAt: true,
  slaStartedAt: true,
  slaTargetMinutes: true,
  resolutionMinutes: true,
  resolvedAt: true,
  firstResponseMinutes: true,
  firstResponseDueAt: true,
  firstResponseStoppedAt: true,
  firstResponseMet: true,
  requester: { select: { name: true } },
  assignee: { select: { id: true, name: true } },
  lastPublicActor: { select: { name: true } },
  empresa: { select: { id: true, name: true } },
  pauses: { select: { startedAt: true, endedAt: true } },
} satisfies Prisma.RequestSelect

function responsableDe(actor: Actor, filtros: FiltroBandeja) {
  if (filtros.soloMios) return actor.id
  return filtros.responsable
}

function clausulaBandeja(actor: Actor, filtros: FiltroBandeja, equipos: TeamName[]) {
  const partes: Prisma.Sql[] = [
    Prisma.sql`status NOT IN (${Prisma.join([...TERMINAL_STATUSES])})`,
  ]
  if (equipos.length === 0) partes.push(Prisma.sql`FALSE`)
  else partes.push(Prisma.sql`team::text IN (${Prisma.join(equipos)})`)
  if (filtros.empresaId) partes.push(Prisma.sql`"empresaId" = ${filtros.empresaId}`)
  if (filtros.prioridad) partes.push(Prisma.sql`priority = ${filtros.prioridad}`)
  const responsable = responsableDe(actor, filtros)
  if (responsable) partes.push(Prisma.sql`"assigneeId" = ${responsable}`)
  return Prisma.join(partes, " AND ")
}

function whereBandeja(actor: Actor, filtros: FiltroBandeja, equipos: TeamName[]) {
  const responsable = responsableDe(actor, filtros)
  return {
    status: { notIn: [...TERMINAL_STATUSES] },
    ...(equipos.length ? { team: { in: equipos } } : { id: "ninguno" }),
    ...(filtros.empresaId ? { empresaId: filtros.empresaId } : {}),
    ...(filtros.prioridad ? { priority: filtros.prioridad } : {}),
    ...(responsable ? { assigneeId: responsable } : {}),
  }
}

async function contarPestanas(actor: Actor, filtros: FiltroBandeja, equipos: TeamName[]) {
  const rows = await prisma.$queryRaw<Array<{
    responder: number
    sin_asignar: number
    mios: number
    espera: number
  }>>(Prisma.sql`
    SELECT
      (COUNT(*) FILTER (WHERE ("lastPublicActorId" IS NULL OR "lastPublicActorId" = "requesterId") AND "lastPublicActorId" IS DISTINCT FROM ${actor.id}))::int AS responder,
      (COUNT(*) FILTER (WHERE "assigneeId" IS NULL))::int AS sin_asignar,
      (COUNT(*) FILTER (WHERE "assigneeId" = ${actor.id}))::int AS mios,
      (COUNT(*) FILTER (WHERE status = 'EN_ESPERA'))::int AS espera
    FROM "Request"
    WHERE ${clausulaBandeja(actor, filtros, equipos)}
  `)
  const row = rows[0]
  return {
    responder: Number(row?.responder ?? 0),
    "sin-asignar": Number(row?.sin_asignar ?? 0),
    mios: Number(row?.mios ?? 0),
    espera: Number(row?.espera ?? 0),
  }
}

export async function listarBandeja(actor: Actor, filtros: FiltroBandeja) {
  const equipos = esAdmin(actor)
    ? (["DESARROLLO", "MARKETING", "COMERCIAL", "INNOVACION"] as TeamName[])
    : [...new Set(actor.memberships.map((item) => item.team))]
  const equiposFiltrados = filtros.equipo && equipos.includes(filtros.equipo) ? [filtros.equipo] : equipos
  const [conteosBase, filas] = await Promise.all([
    contarPestanas(actor, filtros, equiposFiltrados),
    prisma.request.findMany({
      where: whereBandeja(actor, filtros, equiposFiltrados),
      select: seleccionBandeja,
    }),
  ])
  const decoradas = filas.map((fila) => {
    const sla = evaluarSla(fila)
    return { fila, sla }
  }).sort((a, b) => a.sla.remainingMinutes - b.sla.remainingMinutes || a.fila.code.localeCompare(b.fila.code, "es"))
  const porVencer = (item: (typeof decoradas)[number]) => item.sla.state === "VENCIDO" || item.sla.state === "EN_RIESGO" || (item.sla.remainingMinutes > 0 && item.sla.remainingMinutes <= 30)
  const coincide = (tab: TabBandeja, item: (typeof decoradas)[number]) => {
    if (tab === "responder") return esPorResponder({ requesterId: item.fila.requesterId, lastPublicActorId: item.fila.lastPublicActorId }, actor.id)
    if (tab === "sin-asignar") return !item.fila.assigneeId
    if (tab === "mios") return item.fila.assigneeId === actor.id
    if (tab === "espera") return item.fila.status === "EN_ESPERA"
    return porVencer(item)
  }
  const conteos: Record<TabBandeja, number> = { ...conteosBase, vencer: decoradas.filter(porVencer).length }
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
