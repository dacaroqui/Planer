import { Prisma, type Team } from "@prisma/client"
import { DateTime } from "luxon"
import type { Actor, TeamName } from "@/lib/domain"
import { TEAM_LABEL } from "@/lib/domain"
import { prisma } from "@/lib/prisma"
import {
  alcanceRendimiento,
  aplicarSeleccion,
  armarTablero,
  instanteDeCorte,
  personasPermitidas,
  rangoPeriodo,
  serieTendencia,
  ventanasDeTareas,
  vistasCohorte,
  type AlcanceRendimiento,
  type FiltrosRendimiento,
  type OpcionesRendimiento,
  type PersonaCandidata,
  type PersonaRendimiento,
  type Rango,
  type SolicitudMedible,
  type TareasAgg,
} from "@/lib/rendimiento"
import { ZONE } from "@/lib/time"
import { horasDeMinutos } from "@/lib/cronologia"

type Cargada = PersonaRendimiento & PersonaCandidata

const ROLES_OPERATIVOS = ["AGENTE", "LIDER"] as const

export async function tableroRendimiento(actor: Actor, filtros: FiltrosRendimiento, now = new Date()) {
  const alcance = alcanceRendimiento(actor)
  if (alcance.tipo === "ninguno") return { denegado: true as const }
  const periodo = rangoPeriodo({ periodo: filtros.periodo, desde: filtros.desde, hasta: filtros.hasta, now })
  const [candidatas, catalogo] = await Promise.all([cargarPersonas(), cargarCatalogo()])
  let personas = personasPermitidas(actor, candidatas)
  if (filtros.areaId) personas = personas.filter((item) => item.areaId === filtros.areaId)
  const equipoPedido = filtros.equipo
  if (equipoPedido) personas = personas.filter((item) => item.teams.includes(equipoPedido))
  const opciones: OpcionesRendimiento = {
    ...catalogo,
    personas: personas.map((item) => ({ id: item.id, nombre: item.nombre })),
  }
  personas = aplicarSeleccion(alcance, personas, filtros.personas)
  const ids = personas.map((item) => item.id)
  let solicitudes: SolicitudMedible[] = []
  let tareas = new Map<string, TareasAgg>()
  let horasPorPersona = new Map<string, number>()
  if (ids.length > 0) {
    const [solicitudesCargadas, tareasCargadas, horas] = await Promise.all([
      cargarSolicitudes(ids, alcance, filtros, { start: periodo.start, end: periodo.end }),
      cargarTareas(ids, alcance, filtros, periodo, now),
      cargarHoras(ids, periodo),
    ])
    solicitudes = solicitudesCargadas
    tareas = tareasCargadas
    horasPorPersona = horas
  }
  const tablero = armarTablero({
    personas,
    solicitudes,
    tareas,
    periodo,
    now,
    orden: filtros.orden,
    dir: filtros.dir,
    horasPorPersona,
  })
  return {
    denegado: false as const,
    filtros: { ...filtros, periodo: periodo.clave },
    periodo,
    opciones,
    alcance,
    ...tablero,
  }
}

export async function detalleRendimiento(actor: Actor, personaId: string, filtros: FiltrosRendimiento, now = new Date()) {
  const alcance = alcanceRendimiento(actor)
  if (alcance.tipo === "ninguno") return { denegado: true as const }
  const periodo = rangoPeriodo({ periodo: filtros.periodo, desde: filtros.desde, hasta: filtros.hasta, now })
  const [candidatas, catalogo] = await Promise.all([cargarPersonas(), cargarCatalogo()])
  const permitidas = personasPermitidas(actor, candidatas)
  const persona = permitidas.find((item) => item.id === personaId)
  if (!persona) return { denegado: false as const, encontrado: false as const }
  const ventana = ventanaHistorica(periodo, now)
  const [solicitudes, tareas, horasPorPersona] = await Promise.all([
    cargarSolicitudes([personaId], alcance, filtros, ventana),
    cargarTareas([personaId], alcance, filtros, periodo, now),
    cargarHoras([personaId], periodo),
  ])
  const tablero = armarTablero({ personas: [persona], solicitudes, tareas, periodo, now, horasPorPersona })
  const ancla = instanteDeCorte(periodo, now)
  return {
    denegado: false as const,
    encontrado: true as const,
    persona,
    fila: tablero.filas[0],
    solicitudes: vistasCohorte(solicitudes, periodo, now),
    semanas: serieTendencia(solicitudes, ancla, "semana", 8),
    meses: serieTendencia(solicitudes, ancla, "mes", 6),
    filtros: { ...filtros, periodo: periodo.clave, personas: [personaId] },
    periodo,
    opciones: {
      ...catalogo,
      personas: permitidas.map((item) => ({ id: item.id, nombre: item.nombre })),
    },
    alcance,
  }
}

async function cargarPersonas() {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { role: "ADMINISTRADOR" },
        { areaRoles: { some: { role: { in: [...ROLES_OPERATIVOS] } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      areaId: true,
      area: { select: { name: true } },
      areaRoles: { select: { team: true, role: true } },
    },
    orderBy: { name: "asc" },
  })
  return users.map((user) => {
    const roles = new Set<PersonaCandidata["roles"][number]>()
    const teams: TeamName[] = []
    if (user.role === "ADMINISTRADOR") roles.add("ADMINISTRADOR")
    for (const item of user.areaRoles) {
      if (item.role === "AGENTE" || item.role === "LIDER" || item.role === "OBSERVADOR") roles.add(item.role)
      if ((item.role === "AGENTE" || item.role === "LIDER") && !teams.includes(item.team)) teams.push(item.team)
    }
    const persona: Cargada = {
      id: user.id,
      nombre: user.name,
      email: user.email,
      areaId: user.areaId,
      area: user.area.name,
      equipos: teams.map((team) => TEAM_LABEL[team]).join(", ") || "Sin equipo",
      teams,
      roles: [...roles],
    }
    return persona
  })
}

async function cargarCatalogo() {
  const [areas, empresas, tipos] = await Promise.all([
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.requestType.findMany({ where: { active: true }, orderBy: [{ team: "asc" }, { name: "asc" }], select: { id: true, name: true, team: true } }),
  ])
  return {
    areas: areas.map((item) => ({ id: item.id, nombre: item.name })),
    empresas: empresas.map((item) => ({ id: item.id, nombre: item.name })),
    tipos: tipos.map((item) => ({ id: item.id, nombre: item.name, equipo: item.team })),
  }
}

function equipoDe(alcance: AlcanceRendimiento, filtros: FiltrosRendimiento): Team | { in: Team[] } | undefined {
  if (filtros.equipo) {
    if (alcance.tipo === "equipos" && !alcance.teams.includes(filtros.equipo)) return { in: [] }
    return filtros.equipo
  }
  if (alcance.tipo === "equipos") return { in: [...alcance.teams] }
  return undefined
}

function ventanaHistorica(periodo: Rango, now: Date) {
  const ancla = instanteDeCorte(periodo, now)
  const zona = DateTime.fromJSDate(ancla, { zone: ZONE })
  const desde = zona.minus({ months: 5 }).startOf("month")
  const finSemana = zona.startOf("week").plus({ weeks: 1 })
  const finMes = zona.startOf("month").plus({ months: 1 })
  const fin = finSemana > finMes ? finSemana : finMes
  return {
    start: new Date(Math.min(desde.toJSDate().getTime(), periodo.start.getTime())),
    end: new Date(Math.max(fin.toJSDate().getTime(), periodo.end.getTime())),
  }
}

async function cargarSolicitudes(
  ids: string[],
  alcance: AlcanceRendimiento,
  filtros: FiltrosRendimiento,
  ventana: { start: Date; end: Date },
) {
  const equipo = equipoDe(alcance, filtros)
  const rows = await prisma.request.findMany({
    where: {
      assigneeId: { in: ids },
      status: { notIn: ["CANCELADO", "RECHAZADO"] },
      createdAt: { lt: ventana.end },
      OR: [{ resolvedAt: null }, { resolvedAt: { gte: ventana.start } }],
      ...(equipo ? { team: equipo } : {}),
      ...(filtros.empresaId ? { empresaId: filtros.empresaId } : {}),
      ...(filtros.tipoId ? { typeId: filtros.tipoId } : {}),
      ...(filtros.prioridad ? { priority: filtros.prioridad } : {}),
    },
    select: {
      id: true,
      code: true,
      title: true,
      assigneeId: true,
      status: true,
      priority: true,
      slaStartedAt: true,
      slaTargetMinutes: true,
      resolutionMinutes: true,
      resolvedAt: true,
      createdAt: true,
      pauses: { select: { startedAt: true, endedAt: true }, orderBy: { startedAt: "asc" } },
    },
  })
  return rows.flatMap((row) => {
    if (!row.assigneeId) return []
    const solicitud: SolicitudMedible = {
      id: row.id,
      code: row.code,
      title: row.title,
      assigneeId: row.assigneeId,
      status: row.status,
      priority: row.priority,
      slaStartedAt: row.slaStartedAt,
      slaTargetMinutes: row.slaTargetMinutes,
      resolutionMinutes: row.resolutionMinutes,
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt,
      pauses: row.pauses,
    }
    return [solicitud]
  })
}

async function cargarTareas(
  ids: string[],
  alcance: AlcanceRendimiento,
  filtros: FiltrosRendimiento,
  periodo: Rango,
  now: Date,
) {
  const map = new Map<string, TareasAgg>()
  if (ids.length === 0) return map
  const ventanas = ventanasDeTareas(now)
  const partes: Prisma.Sql[] = []
  if (alcance.tipo === "equipos") partes.push(Prisma.sql`r.team::text IN (${Prisma.join(alcance.teams)})`)
  if (filtros.equipo) partes.push(Prisma.sql`r.team::text = ${filtros.equipo}`)
  if (filtros.empresaId) partes.push(Prisma.sql`r."empresaId" = ${filtros.empresaId}`)
  if (filtros.tipoId) partes.push(Prisma.sql`r."typeId" = ${filtros.tipoId}`)
  if (filtros.prioridad) partes.push(Prisma.sql`r.priority = ${filtros.prioridad}`)
  const hayPedido = Boolean(filtros.equipo || filtros.empresaId || filtros.tipoId || filtros.prioridad)
  const extra = partes.length === 0
    ? Prisma.empty
    : hayPedido
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "Request" r WHERE r.id = t."requestId" AND ${Prisma.join(partes, " AND ")})`
      : Prisma.sql`AND (t."requestId" IS NULL OR EXISTS (SELECT 1 FROM "Request" r WHERE r.id = t."requestId" AND ${Prisma.join(partes, " AND ")}))`
  const rows = await prisma.$queryRaw<Array<{
    id: string
    semana: number
    mes: number
    anio: number
    asignadas: number
    completadas: number
    sinHacer: number
  }>>(Prisma.sql`
    SELECT t."assigneeId" AS id,
      (COUNT(*) FILTER (WHERE t.status::text = 'HECHA' AND t."completedAt" >= ${ventanas.semana.start} AND t."completedAt" < ${ventanas.semana.end}))::int AS semana,
      (COUNT(*) FILTER (WHERE t.status::text = 'HECHA' AND t."completedAt" >= ${ventanas.mes.start} AND t."completedAt" < ${ventanas.mes.end}))::int AS mes,
      (COUNT(*) FILTER (WHERE t.status::text = 'HECHA' AND t."completedAt" >= ${ventanas.anio.start} AND t."completedAt" < ${ventanas.anio.end}))::int AS anio,
      (COUNT(*) FILTER (WHERE t."createdAt" >= ${periodo.start} AND t."createdAt" < ${periodo.end}))::int AS asignadas,
      (COUNT(*) FILTER (WHERE t.status::text = 'HECHA' AND t."completedAt" >= ${periodo.start} AND t."completedAt" < ${periodo.end}))::int AS completadas,
      (COUNT(*) FILTER (WHERE t."createdAt" >= ${periodo.start} AND t."createdAt" < ${periodo.end} AND t.status::text <> 'HECHA'))::int AS "sinHacer"
    FROM "Tarea" t
    WHERE t."assigneeId" IN (${Prisma.join(ids)})
    ${extra}
    GROUP BY t."assigneeId"
  `)
  for (const row of rows) {
    map.set(row.id, {
      semana: Number(row.semana),
      mes: Number(row.mes),
      anio: Number(row.anio),
      asignadas: Number(row.asignadas),
      completadas: Number(row.completadas),
      sinHacer: Number(row.sinHacer),
    })
  }
  return map
}

async function cargarHoras(ids: string[], periodo: Rango) {
  const map = new Map<string, number>()
  if (ids.length === 0) return map
  const filas = await prisma.comment.groupBy({
    by: ["authorId"],
    where: { kind: "REGISTRO", authorId: { in: ids }, createdAt: { gte: periodo.start, lt: periodo.end } },
    _sum: { minutes: true },
  })
  for (const fila of filas) map.set(fila.authorId, horasDeMinutos(fila._sum.minutes ?? 0))
  return map
}
