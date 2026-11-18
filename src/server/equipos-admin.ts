import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado, PREFIJO_EQUIPO, TEAM_LABEL, TEAMS, esTeam, type Actor } from "@/lib/domain"
import { puedeAdministrar } from "@/lib/permissions"

export const PLANTILLA_ESTANDAR = [
  { key: "NUEVO", name: "Nuevo", category: "POR_HACER", boardColumn: "Nuevo" },
  { key: "EN_ANALISIS", name: "En análisis", category: "EN_CURSO", boardColumn: "En análisis" },
  { key: "EN_ESPERA", name: "En espera de información", category: "EN_CURSO", boardColumn: "En espera" },
  { key: "EN_CURSO", name: "En curso", category: "EN_CURSO", boardColumn: "En curso" },
  { key: "EN_REVISION", name: "En revisión", category: "EN_CURSO", boardColumn: "En revisión" },
  { key: "HECHO", name: "Hecho", category: "TERMINADO", boardColumn: "Hecho" },
  { key: "CANCELADO", name: "Cancelado", category: "TERMINADO", boardColumn: "Cancelado" },
] as const

const TRANSICIONES_PLANTILLA = [
  { name: "Iniciar análisis", from: "NUEVO", to: "EN_ANALISIS" },
  { name: "Pedir información", from: "EN_ANALISIS", to: "EN_ESPERA" },
  { name: "Pasar a en curso", from: "EN_ESPERA", to: "EN_CURSO" },
  { name: "Enviar a revisión", from: "EN_CURSO", to: "EN_REVISION" },
  { name: "Marcar hecho", from: "EN_REVISION", to: "HECHO" },
  { name: "Cancelar", from: "NUEVO", to: "CANCELADO" },
]

function exigir(actor: Actor) {
  if (!puedeAdministrar(actor)) throw new PermisoDenegado("Solo el administrador configura las áreas de trabajo.")
}

export async function listarAreasTrabajo() {
  const [catalogo, tipos, estados, transiciones, lideres] = await Promise.all([
    prisma.catalogItem.findMany({ where: { kind: "EQUIPO" } }),
    prisma.requestType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.workflowState.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.workflowTransition.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.areaRole.findMany({
      where: { role: "LIDER", user: { active: true, deactivatedAt: null } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ])
  return TEAMS.map((team) => {
    const ficha = catalogo.find((item) => item.key === team)
    return {
      key: team,
      name: ficha?.name || TEAM_LABEL[team],
      prefix: PREFIJO_EQUIPO[team],
      description: ficha?.description ?? "",
      icon: ficha?.icon ?? "",
      color: ficha?.color ?? "",
      tipos: tipos.filter((item) => item.team === team).map((item) => ({ id: item.id, name: item.name })),
      estados: estados.filter((item) => item.team === team).map((item) => ({ id: item.id, key: item.key, name: item.name })),
      transiciones: transiciones.filter((item) => item.team === team).map((item) => ({ id: item.id, name: item.name, from: item.fromKeys, to: item.toKey })),
      lideres: lideres.filter((item) => item.team === team).map((item) => ({ id: item.user.id, name: item.user.name })),
    }
  })
}

export async function guardarPresentacionEquipo(
  actor: Actor,
  input: { team: string; name: string; description: string; icon: string; color: string },
) {
  exigir(actor)
  if (!esTeam(input.team)) throw new DomainError("Esa área no está en el catálogo fijo.")
  const name = input.name.trim()
  if (name.length < 2) throw new DomainError("Indique el nombre del área.")
  const antes = await prisma.catalogItem.findUnique({ where: { kind_key: { kind: "EQUIPO", key: input.team } } })
  const data = {
    name,
    description: input.description.trim(),
    icon: input.icon.trim(),
    color: input.color.trim(),
  }
  const guardado = await prisma.catalogItem.upsert({
    where: { kind_key: { kind: "EQUIPO", key: input.team } },
    update: data,
    create: { kind: "EQUIPO", key: input.team, sortOrder: TEAMS.indexOf(input.team) + 1, ...data },
  })
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "EDITAR_AREA",
      entity: "Equipo",
      entityId: input.team,
      fromValue: antes?.name ?? "",
      toValue: name,
    },
  })
  return guardado
}

export async function definirLiderArea(actor: Actor, input: { userId: string; team: string; activo: boolean }) {
  exigir(actor)
  if (!esTeam(input.team)) throw new DomainError("Esa área no está en el catálogo fijo.")
  const user = await prisma.user.findFirst({ where: { id: input.userId, active: true, deactivatedAt: null } })
  if (!user) throw new DomainError("Elija una persona activa.")
  if (input.activo) {
    await prisma.areaRole.upsert({
      where: { userId_team_role: { userId: user.id, team: input.team, role: "LIDER" } },
      update: {},
      create: { userId: user.id, team: input.team, role: "LIDER" },
    })
  } else {
    await prisma.areaRole.deleteMany({ where: { userId: user.id, team: input.team, role: "LIDER" } })
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: input.activo ? "LIDER_AREA" : "QUITAR_LIDER_AREA",
      entity: "Equipo",
      entityId: input.team,
      toValue: user.name,
    },
  })
}

export function rechazarAreaNueva() {
  throw new DomainError("Las áreas de trabajo siguen fijas en el código. Una área adicional requiere una tabla de equipos, sin borrar las columnas actuales.")
}

export async function aplicarPlantillaEstandar(actor: Actor, team: string) {
  exigir(actor)
  if (!esTeam(team)) throw new DomainError("Esa área no está en el catálogo fijo.")
  const existentes = await prisma.workflowState.findMany({ where: { team }, select: { key: true } })
  const claves = new Set(existentes.map((item) => item.key))
  let agregados = 0
  for (const [indice, estado] of PLANTILLA_ESTANDAR.entries()) {
    if (claves.has(estado.key)) continue
    await prisma.workflowState.create({
      data: { team, key: estado.key, name: estado.name, category: estado.category, boardColumn: estado.boardColumn, sortOrder: (indice + 1) * 10 },
    })
    agregados += 1
  }
  for (const paso of TRANSICIONES_PLANTILLA) {
    const ya = await prisma.workflowTransition.findFirst({ where: { team, name: paso.name, toKey: paso.to } })
    if (ya) continue
    await prisma.workflowTransition.create({
      data: { team, name: paso.name, fromKeys: paso.from, toKey: paso.to, allowedRoles: "LIDER", slaEffect: "NONE" },
    })
  }
  await prisma.auditLog.create({
    data: { actorId: actor.id, action: "PLANTILLA_AREA", entity: "Equipo", entityId: team, toValue: String(agregados) },
  })
  return { agregados }
}
