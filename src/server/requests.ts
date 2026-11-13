import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { DateTime } from "luxon"
import { Prisma, type Brand, type Priority, type Team } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { appBaseUrl, createEmailProvider, type EmailMessage, type EmailProvider } from "@/lib/email"
import { assertAllowedFile, safeFilename, uploadDir } from "@/lib/files"
import {
  DONE_STATUSES,
  DomainError,
  PAUSE_STATUSES,
  RESOLVED_STATUSES,
  TEAM_LABEL,
  statusLabel,
  type Actor,
  type TeamName,
} from "@/lib/domain"
import {
  puedeAdjuntar,
  puedeAdministrar,
  puedeAsignar,
  puedeComentar,
  puedeRadicar,
  puedeVerNotaInterna,
  encontrarTransicion,
  transicionesPara,
} from "@/lib/permissions"
import { describeWindows, slaSnapshot, windowsFromEnv, type PauseInterval } from "@/lib/sla"
import { ZONE } from "@/lib/time"

type Tx = Prisma.TransactionClient

export type Deps = { email?: EmailProvider; now?: Date }

const detailInclude = {
  type: true,
  area: true,
  requester: true,
  assignee: true,
  comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
  activities: { include: { actor: true }, orderBy: { createdAt: "asc" as const } },
  attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" as const } },
  pauses: { orderBy: { startedAt: "asc" as const } },
} satisfies Prisma.RequestInclude

function clock(deps?: Deps) {
  return deps?.now ?? new Date()
}

function mailer(deps?: Deps) {
  return deps?.email ?? createEmailProvider()
}

function riskRatio() {
  const value = Number(process.env.SLA_RISK_RATIO || 0.75)
  return Number.isFinite(value) && value > 0 && value < 1 ? value : 0.75
}

function pausesOf(pauses: { startedAt: Date; endedAt: Date | null }[]): PauseInterval[] {
  return pauses.map((pause) => ({ startedAt: pause.startedAt, endedAt: pause.endedAt }))
}

export function evaluarSla(request: {
  slaStartedAt: Date
  slaTargetMinutes: number
  pauses: { startedAt: Date; endedAt: Date | null }[]
  resolvedAt: Date | null
  status: string
}, now = new Date()) {
  return slaSnapshot(
    {
      startedAt: request.slaStartedAt,
      targetMinutes: request.slaTargetMinutes,
      pauses: pausesOf(request.pauses),
      now,
      resolvedAt: request.resolvedAt,
      cancelled: request.status === "CANCELADO",
      riskRatio: riskRatio(),
    },
    windowsFromEnv(),
  )
}

function requestLink(code: string) {
  return `${appBaseUrl()}/requerimientos/${code}`
}

async function fanout(
  tx: Tx,
  userIds: Array<string | null | undefined>,
  payload: { requestId: string; subject: string; body: string; dedupeKey?: string },
  bucket: EmailMessage[],
  exceptId?: string,
) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id && id !== exceptId)))]
  if (ids.length === 0) return
  const users = await tx.user.findMany({ where: { id: { in: ids }, active: true } })
  for (const user of users) {
    if (payload.dedupeKey) {
      const existing = await tx.notification.findFirst({
        where: { userId: user.id, dedupeKey: payload.dedupeKey },
      })
      if (existing) continue
    }
    await tx.notification.create({
      data: {
        userId: user.id,
        requestId: payload.requestId,
        subject: payload.subject,
        body: payload.body,
        dedupeKey: payload.dedupeKey,
      },
    })
    bucket.push({ to: user.email, subject: payload.subject, text: payload.body })
  }
}

async function deliver(email: EmailProvider, messages: EmailMessage[]) {
  for (const message of messages) {
    try {
      await email.send(message)
    } catch (error) {
      console.error("[correo] No se pudo enviar", message.to, error)
    }
  }
}

async function leaderIds(tx: Tx, team: Team) {
  const leaders = await tx.user.findMany({
    where: { role: "LIDER", team, active: true },
    select: { id: true },
  })
  return leaders.map((leader) => leader.id)
}

async function nextCode(tx: Tx, now: Date) {
  const year = DateTime.fromJSDate(now).setZone(ZONE).year
  const rows = await tx.$queryRaw<Array<{ last: number }>>`
    INSERT INTO "Sequence" ("year", "last") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "last" = "Sequence"."last" + 1
    RETURNING "last"
  `
  const last = Number(rows[0]?.last)
  if (!Number.isFinite(last)) throw new DomainError("No se pudo generar el consecutivo.")
  return `REQ-${year}-${String(last).padStart(4, "0")}`
}

function parseDesired(value?: string | null) {
  if (!value) return null
  const parsed = DateTime.fromISO(value, { zone: ZONE })
  if (!parsed.isValid) throw new DomainError("La fecha deseada no es válida.")
  return parsed.startOf("day").toJSDate()
}

export async function radicar(
  actor: Actor,
  input: {
    title: string
    description: string
    expectedResult: string
    team: Team
    typeId: string
    priority: Priority
    brand: Brand
    desiredDate?: string | null
  },
  deps?: Deps,
) {
  if (!puedeRadicar(actor)) throw new DomainError("Su perfil no puede radicar requerimientos.")
  const type = await prisma.requestType.findFirst({ where: { id: input.typeId, active: true } })
  if (!type || type.team !== input.team) {
    throw new DomainError("Elija un tipo de requerimiento del equipo destino.")
  }
  const area = await prisma.area.findFirst({ where: { id: actor.areaId, active: true } })
  if (!area) throw new DomainError("Su usuario no tiene un área activa. Pida al administrador que la asigne.")

  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const request = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, now)
    const created = await tx.request.create({
      data: {
        code,
        title: input.title,
        description: input.description,
        expectedResult: input.expectedResult,
        brand: input.brand,
        priority: input.priority,
        team: input.team,
        status: "RADICADO",
        desiredDate: parseDesired(input.desiredDate),
        typeId: type.id,
        areaId: area.id,
        requesterId: actor.id,
        slaStartedAt: now,
        slaTargetMinutes: type.slaMinutes,
        createdAt: now,
        updatedAt: now,
      },
    })
    await tx.activity.create({
      data: {
        requestId: created.id,
        actorId: actor.id,
        kind: "CREATED",
        message: "Radicó el requerimiento.",
        toValue: "RADICADO",
        createdAt: now,
      },
    })
    const body = [
      `${actor.name} radicó ${code} para ${TEAM_LABEL[input.team]}.`,
      input.title,
      `Prioridad: ${input.priority}.`,
      requestLink(code),
    ].join("\n")
    await fanout(
      tx,
      await leaderIds(tx, input.team),
      { requestId: created.id, subject: `${code} · nuevo requerimiento`, body },
      messages,
      actor.id,
    )
    return created
  })
  await deliver(email, messages)
  return request
}

export async function transicionar(actor: Actor, requestId: string, to: string, comment: string | null, deps?: Deps) {
  const current = await prisma.request.findUnique({
    where: { id: requestId },
    include: { type: true, assignee: true },
  })
  if (!current) throw new DomainError("El requerimiento no existe.")
  const transition = encontrarTransicion(actor, {
    id: current.id,
    team: current.team,
    status: current.status,
    requesterId: current.requesterId,
    requiresApproval: current.type.requiresApproval,
  }, to)
  if (!transition) {
    throw new DomainError(`No puede pasar este requerimiento a «${statusLabel(to)}».`)
  }
  const note = comment?.trim() ?? ""
  if (transition.requiresComment && note.length < 2) {
    throw new DomainError("Escriba un comentario para esta acción.")
  }

  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.RequestUpdateInput = {
      status: to,
      updatedAt: now,
    }
    const openingPause = !PAUSE_STATUSES.has(current.status) && PAUSE_STATUSES.has(to)
    const closingPause = PAUSE_STATUSES.has(current.status) && !PAUSE_STATUSES.has(to)
    const enteringResolved = RESOLVED_STATUSES.has(to) || to === "CERRADO"
    const leavingResolved =
      (RESOLVED_STATUSES.has(current.status) || current.status === "CERRADO") &&
      !RESOLVED_STATUSES.has(to) &&
      to !== "CERRADO" &&
      to !== "CANCELADO"
    if (enteringResolved && !current.resolvedAt) data.resolvedAt = now
    if (to === "CERRADO" || to === "CANCELADO") data.closedAt = now
    if (leavingResolved) data.resolvedAt = null
    if ((current.status === "CERRADO" || current.status === "CANCELADO") && to !== "CERRADO" && to !== "CANCELADO") {
      data.closedAt = null
    }
    if ((to === "RESUELTO" || to === "ENTREGADO") && note) data.resolution = note

    const saved = await tx.request.update({ where: { id: current.id }, data })
    if (openingPause) {
      await tx.slaPause.create({
        data: { requestId: current.id, startedAt: now, reason: to },
      })
    }
    if (closingPause) {
      await tx.slaPause.updateMany({
        where: { requestId: current.id, endedAt: null },
        data: { endedAt: now },
      })
    }
    await tx.activity.create({
      data: {
        requestId: current.id,
        actorId: actor.id,
        kind: to === "APROBADO" ? "APPROVED" : to === "DEVUELTO" ? "RETURNED" : "STATUS",
        message: note
          ? `${transition.label}: ${note}`
          : `${transition.label}. Pasó de ${statusLabel(current.status)} a ${statusLabel(to)}.`,
        fromValue: current.status,
        toValue: to,
        createdAt: now,
      },
    })
    if (note) {
      await tx.comment.create({
        data: {
          requestId: current.id,
          authorId: actor.id,
          body: note,
          internal: false,
          createdAt: now,
        },
      })
    }
    const leaders = await leaderIds(tx, current.team)
    const verb =
      to === "APROBADO" ? "aprobó" : to === "DEVUELTO" ? "devolvió" : "actualizó"
    const body = [
      `${actor.name} ${verb} ${current.code}: ${statusLabel(current.status)} → ${statusLabel(to)}.`,
      note,
      requestLink(current.code),
    ].filter(Boolean).join("\n")
    await fanout(
      tx,
      [current.requesterId, current.assigneeId, ...leaders],
      { requestId: current.id, subject: `${current.code} · ${statusLabel(to)}`, body },
      messages,
      actor.id,
    )
    return saved
  })
  await deliver(email, messages)
  return updated
}

export async function comentar(
  actor: Actor,
  requestId: string,
  body: string,
  internal: boolean,
  deps?: Deps,
) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeComentar(actor, current, internal)) {
    throw new DomainError(internal
      ? "Las notas internas solo las escribe el equipo destino."
      : "No puede comentar en este requerimiento.")
  }
  const text = body.trim()
  if (text.length < 2) throw new DomainError("Escriba un comentario.")
  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { requestId, authorId: actor.id, body: text, internal, createdAt: now },
    })
    await tx.activity.create({
      data: {
        requestId,
        actorId: actor.id,
        kind: "COMMENT",
        message: internal ? "Dejó una nota interna." : "Comentó en el requerimiento.",
        internal,
        createdAt: now,
      },
    })
    await tx.request.update({ where: { id: requestId }, data: { updatedAt: now } })
    const leaders = await leaderIds(tx, current.team)
    const recipients = internal
      ? [current.assigneeId, ...leaders]
      : [current.requesterId, current.assigneeId, ...leaders]
    const mailBody = [
      internal ? `${actor.name} dejó una nota interna en ${current.code}.` : `${actor.name} comentó en ${current.code}.`,
      text,
      requestLink(current.code),
    ].join("\n")
    await fanout(
      tx,
      recipients,
      {
        requestId,
        subject: `${current.code} · ${internal ? "nota interna" : "comentario"}`,
        body: mailBody,
      },
      messages,
      actor.id,
    )
    return created
  })
  await deliver(email, messages)
  return comment
}

export async function asignar(actor: Actor, requestId: string, assigneeId: string, deps?: Deps) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeAsignar(actor, current)) throw new DomainError("No puede asignar este requerimiento.")
  const assignee = await prisma.user.findFirst({
    where: {
      id: assigneeId,
      active: true,
      team: current.team,
      role: { in: ["AGENTE", "LIDER"] },
    },
  })
  if (!assignee) throw new DomainError("Elija un agente activo del equipo destino.")
  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.request.update({
      where: { id: requestId },
      data: { assigneeId: assignee.id, updatedAt: now },
    })
    await tx.activity.create({
      data: {
        requestId,
        actorId: actor.id,
        kind: "ASSIGN",
        message: `Asignó el requerimiento a ${assignee.name}.`,
        toValue: assignee.id,
        createdAt: now,
      },
    })
    await fanout(
      tx,
      [assignee.id],
      {
        requestId,
        subject: `${current.code} · le asignaron un requerimiento`,
        body: `${actor.name} le asignó ${current.code}: ${current.title}\n${requestLink(current.code)}`,
      },
      messages,
      actor.id,
    )
    return saved
  })
  await deliver(email, messages)
  return updated
}

export async function adjuntar(
  actor: Actor,
  requestId: string,
  file: { name: string; type: string; bytes: Buffer },
  deps?: Deps,
) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeAdjuntar(actor, current)) throw new DomainError("No puede adjuntar archivos a este requerimiento.")
  let ext = ""
  try {
    ext = assertAllowedFile(file.name, file.bytes.length)
  } catch (error) {
    throw new DomainError(error instanceof Error ? error.message : "Archivo inválido.")
  }
  const now = clock(deps)
  const storedName = `${randomUUID()}.${ext}`
  const directory = uploadDir()
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, storedName), file.bytes)
  const filename = safeFilename(file.name)
  return prisma.$transaction(async (tx) => {
    const attachment = await tx.attachment.create({
      data: {
        requestId,
        uploadedById: actor.id,
        filename,
        storedName,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.bytes.length,
        createdAt: now,
      },
    })
    await tx.activity.create({
      data: {
        requestId,
        actorId: actor.id,
        kind: "ATTACHMENT",
        message: `Adjuntó ${filename}.`,
        createdAt: now,
      },
    })
    await tx.request.update({ where: { id: requestId }, data: { updatedAt: now } })
    return attachment
  })
}

export async function getDetalle(actor: Actor, code: string) {
  const request = await prisma.request.findUnique({
    where: { code },
    include: detailInclude,
  })
  if (!request) return null
  const access = {
    id: request.id,
    team: request.team,
    status: request.status,
    requesterId: request.requesterId,
    requiresApproval: request.type.requiresApproval,
  }
  const seeInternal = puedeVerNotaInterna(actor, request.team)
  const agents = puedeAsignar(actor, request)
    ? await prisma.user.findMany({
        where: { active: true, team: request.team, role: { in: ["AGENTE", "LIDER"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      })
    : []
  return {
    request: {
      ...request,
      comments: request.comments.filter((comment) => seeInternal || !comment.internal),
      activities: request.activities.filter((activity) => seeInternal || !activity.internal),
    },
    sla: evaluarSla(request),
    transitions: transicionesPara(actor, access),
    canCommentPublic: puedeComentar(actor, request, false),
    canCommentInternal: puedeComentar(actor, request, true),
    canAssign: puedeAsignar(actor, request),
    canAttach: puedeAdjuntar(actor, request),
    seeInternal,
    agents,
    jornada: describeWindows(),
  }
}

export type ListQuery = {
  q?: string
  team?: string
  status?: string
  priority?: string
  brand?: string
  mine?: boolean
  assignedToMe?: boolean
  queueTeam?: TeamName | null
  openOnly?: boolean
  page?: number
  pageSize?: number
}

export async function listar(actor: Actor, query: ListQuery) {
  const pageSize = query.pageSize ?? 12
  const page = Math.max(1, query.page ?? 1)
  const where: Prisma.RequestWhereInput = {}
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { code: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ]
  }
  if (query.team === "DESARROLLO" || query.team === "MARKETING") where.team = query.team
  if (query.status) where.status = query.status
  if (query.priority === "BAJA" || query.priority === "MEDIA" || query.priority === "ALTA" || query.priority === "CRITICA") {
    where.priority = query.priority
  }
  if (query.brand === "CIFES" || query.brand === "LUVANIA" || query.brand === "AMBAS") where.brand = query.brand
  if (query.mine) where.requesterId = actor.id
  if (query.assignedToMe) where.assigneeId = actor.id
  if (query.queueTeam) where.team = query.queueTeam
  if ((query.queueTeam || query.openOnly) && !query.status) {
    where.status = { notIn: ["CERRADO", "CANCELADO"] }
  }
  const [total, rows] = await prisma.$transaction([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      include: {
        type: true,
        requester: true,
        assignee: true,
        area: true,
        pauses: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((row) => ({ ...row, sla: evaluarSla(row) })),
  }
}

export async function resumen() {
  const now = new Date()
  const items = await prisma.request.findMany({
    where: { status: { notIn: ["CERRADO", "CANCELADO"] } },
    include: {
      pauses: true,
      type: true,
      requester: true,
      assignee: true,
      area: true,
    },
    orderBy: { updatedAt: "desc" },
  })
  const decorated = items.map((item) => ({ ...item, sla: evaluarSla(item, now) }))
  const abiertos = decorated.filter((item) => !DONE_STATUSES.has(item.status))
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const resueltos7 = await prisma.request.count({ where: { resolvedAt: { gte: since } } })
  const porEquipo = (["DESARROLLO", "MARKETING"] as const).map((team) => {
    const group = decorated.filter((item) => item.team === team)
    return {
      team,
      abiertos: group.filter((item) => !DONE_STATUSES.has(item.status)).length,
      vencidos: group.filter((item) => item.sla.state === "VENCIDO").length,
      enRiesgo: group.filter((item) => item.sla.state === "EN_RIESGO").length,
      enPausa: group.filter((item) => item.sla.state === "EN_PAUSA").length,
    }
  })
  return { items: decorated, abiertos, resueltos7, porEquipo }
}

export async function vigilarSlas(deps?: Deps) {
  const now = clock(deps)
  const email = mailer(deps)
  const open = await prisma.request.findMany({
    where: { status: { notIn: ["RESUELTO", "ENTREGADO", "CERRADO", "CANCELADO"] } },
    include: { pauses: true },
  })
  let sent = 0
  for (const request of open) {
    const sla = evaluarSla(request, now)
    if (sla.state !== "VENCIDO" && sla.state !== "EN_RIESGO") continue
    const messages: EmailMessage[] = []
    const leaders = await prisma.user.findMany({
      where: { role: "LIDER", team: request.team, active: true },
      select: { id: true },
    })
    const label = sla.state === "VENCIDO" ? "venció el SLA" : "el SLA está en riesgo"
    await prisma.$transaction(async (tx) => {
      await fanout(
        tx,
        [request.requesterId, request.assigneeId, ...leaders.map((leader) => leader.id)],
        {
          requestId: request.id,
          subject: `${request.code} · ${label}`,
          body: `${request.code} ${label}.\n${request.title}\n${requestLink(request.code)}`,
          dedupeKey: `sla-${sla.state}-${request.id}`,
        },
        messages,
      )
    })
    await deliver(email, messages)
    sent += messages.length
  }
  return { revisados: open.length, enviados: sent }
}

export async function listarAvisos(actor: Actor) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: actor.id },
      include: { request: { select: { code: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
  ])
  return { items, unread }
}

export async function marcarAvisosLeidos(actor: Actor) {
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function actualizarUsuario(
  actor: Actor,
  userId: string,
  input: { role: Actor["role"]; team: TeamName | null; areaId: string; active: boolean },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona usuarios.")
  if (userId === actor.id && !input.active) throw new DomainError("No puede desactivar su propio usuario.")
  if ((input.role === "AGENTE" || input.role === "LIDER") && !input.team) {
    throw new DomainError("Un agente o líder debe pertenecer a Desarrollo o a Marketing.")
  }
  const area = await prisma.area.findFirst({ where: { id: input.areaId, active: true } })
  if (!area) throw new DomainError("Elija un área activa.")
  const team = input.role === "AGENTE" || input.role === "LIDER" ? input.team : null
  return prisma.user.update({
    where: { id: userId },
    data: { role: input.role, team, areaId: area.id, active: input.active },
  })
}

export async function crearArea(actor: Actor, name: string) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona el catálogo.")
  const clean = name.trim()
  if (clean.length < 3) throw new DomainError("El nombre del área es muy corto.")
  try {
    return await prisma.area.create({ data: { name: clean } })
  } catch {
    throw new DomainError("Ya existe un área con ese nombre.")
  }
}

export async function crearTipo(
  actor: Actor,
  input: { team: TeamName; name: string; description: string; slaHours: number; requiresApproval: boolean },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona el catálogo.")
  if (!Number.isFinite(input.slaHours) || input.slaHours < 1 || input.slaHours > 400) {
    throw new DomainError("El SLA debe estar entre 1 y 400 horas hábiles.")
  }
  const name = input.name.trim()
  const description = input.description.trim()
  if (name.length < 3 || description.length < 8) throw new DomainError("Complete el nombre y la descripción del tipo.")
  try {
    return await prisma.requestType.create({
      data: {
        team: input.team,
        name,
        description,
        slaMinutes: Math.round(input.slaHours * 60),
        requiresApproval: input.requiresApproval,
      },
    })
  } catch {
    throw new DomainError("Ya existe ese tipo en el equipo.")
  }
}

export async function actualizarTipo(
  actor: Actor,
  id: string,
  input: { description: string; slaHours: number; requiresApproval: boolean; active: boolean },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona el catálogo.")
  if (!Number.isFinite(input.slaHours) || input.slaHours < 1 || input.slaHours > 400) {
    throw new DomainError("El SLA debe estar entre 1 y 400 horas hábiles.")
  }
  return prisma.requestType.update({
    where: { id },
    data: {
      description: input.description.trim(),
      slaMinutes: Math.round(input.slaHours * 60),
      requiresApproval: input.requiresApproval,
      active: input.active,
    },
  })
}

export async function catalogos() {
  const [areas, types, users] = await Promise.all([
    prisma.area.findMany({ orderBy: { name: "asc" } }),
    prisma.requestType.findMany({ orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({ include: { area: true }, orderBy: { name: "asc" } }),
  ])
  return { areas, types, users }
}
