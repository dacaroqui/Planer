import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { DateTime } from "luxon"
import { Prisma, type Team } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { appBaseUrl, createEmailProvider, type EmailMessage, type EmailProvider } from "@/lib/email"
import { assertAllowedFile, safeFilename, uploadDir } from "@/lib/files"
import { pareceDatoPersonal } from "@/lib/datos-personales"
import {
  DONE_STATUSES,
  DomainError,
  PAUSE_STATUSES,
  TEAM_LABEL,
  TERMINAL_STATUSES,
  statusLabel,
  type Actor,
  type TeamName,
} from "@/lib/domain"
import { TRANSICIONES_OFICIALES, nombreEstado, type TransicionOficial } from "@/lib/flujo-oficial"
import {
  encontrarTransicion,
  puedeAdjuntar,
  puedeAdministrar,
  puedeAsignar,
  puedeAutoasignarse,
  puedeCambiarPrioridad,
  puedeComentar,
  puedeEditarCampos,
  puedeRadicar,
  puedeTrasladar,
  puedeVer,
  puedeVerNotaInterna,
  transicionesPara,
  esAdmin,
  rolEn,
} from "@/lib/permissions"
import { addBusinessMinutes, describeWindows, slaSnapshot, windowsFromEnv, type PauseInterval } from "@/lib/sla"
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
function link(code: string) {
  return `${appBaseUrl()}/requerimientos/${code}`
}
function pausesOf(pauses: { startedAt: Date; endedAt: Date | null }[]): PauseInterval[] {
  return pauses.map((pause) => ({ startedAt: pause.startedAt, endedAt: pause.endedAt }))
}

export function evaluarSla(request: {
  slaStartedAt: Date
  resolutionMinutes?: number
  slaTargetMinutes: number
  pauses: { startedAt: Date; endedAt: Date | null }[]
  resolvedAt: Date | null
  status: string
  firstResponseMinutes?: number
  firstResponseDueAt?: Date | null
  firstResponseStoppedAt?: Date | null
  firstResponseMet?: boolean | null
}, now = new Date()) {
  const target = request.resolutionMinutes || request.slaTargetMinutes
  const solution = slaSnapshot(
    {
      startedAt: request.slaStartedAt,
      targetMinutes: target,
      pauses: pausesOf(request.pauses),
      now,
      resolvedAt: request.resolvedAt,
      cancelled: request.status === "CANCELADO" || request.status === "RECHAZADO",
      riskRatio: 0.5,
    },
    windowsFromEnv(),
  )
  const firstTarget = request.firstResponseMinutes ?? 0
  let firstState: "A_TIEMPO" | "EN_RIESGO" | "VENCIDO" | "CUMPLIDO" | "INCUMPLIDO" | "NO_APLICA" = "NO_APLICA"
  if (firstTarget > 0 && request.firstResponseDueAt) {
    if (request.firstResponseStoppedAt) firstState = request.firstResponseMet ? "CUMPLIDO" : "INCUMPLIDO"
    else if (now.getTime() > request.firstResponseDueAt.getTime()) firstState = "VENCIDO"
    else {
      const left = (request.firstResponseDueAt.getTime() - now.getTime()) / 60000
      firstState = left / firstTarget <= 0.5 ? "EN_RIESGO" : "A_TIEMPO"
    }
  }
  return { ...solution, firstState, firstDueAt: request.firstResponseDueAt ?? null }
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
      const existing = await tx.notification.findFirst({ where: { userId: user.id, dedupeKey: payload.dedupeKey } })
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
  const leaders = await tx.areaRole.findMany({ where: { team, role: "LIDER" }, select: { userId: true } })
  return leaders.map((leader) => leader.userId)
}

async function nextCode(tx: Tx, team: TeamName) {
  const prefix = team === "DESARROLLO" ? "DES" : "MKT"
  const rows = await tx.$queryRaw<Array<{ last: number }>>`
    INSERT INTO "CodeSequence" ("prefix", "last") VALUES (${prefix}, 1)
    ON CONFLICT ("prefix") DO UPDATE SET "last" = "CodeSequence"."last" + 1
    RETURNING "last"
  `
  const last = Number(rows[0]?.last)
  if (!Number.isFinite(last)) throw new DomainError("No se pudo generar el radicado.")
  return `${prefix}-${String(last).padStart(4, "0")}`
}

function mapTransition(row: {
  team: Team
  name: string
  fromKeys: string
  toKey: string
  allowedRoles: string
  requiresComment: boolean
  requiresAssignee: boolean
  requiresCommittedDate: boolean
  requiresDelivery: boolean
  slaEffect: string
  resolution: string
  clearResolution: boolean
  incrementRounds: boolean
  toPrevious: boolean
  reopenWithinDays: number
}): TransicionOficial {
  return {
    team: row.team,
    name: row.name,
    from: row.fromKeys.split(",").filter(Boolean),
    to: row.toKey,
    roles: row.allowedRoles.split(",").filter(Boolean) as TransicionOficial["roles"],
    requiresComment: row.requiresComment,
    requiresAssignee: row.requiresAssignee,
    requiresCommittedDate: row.requiresCommittedDate,
    requiresDelivery: row.requiresDelivery,
    slaEffect: row.slaEffect as TransicionOficial["slaEffect"],
    resolution: row.resolution || undefined,
    clearResolution: row.clearResolution,
    incrementRounds: row.incrementRounds,
    toPrevious: row.toPrevious,
    reopenWithinDays: row.reopenWithinDays,
  }
}

async function catalogoDe(team: TeamName) {
  const rows = await prisma.workflowTransition.findMany({ where: { team, active: true } })
  if (rows.length === 0) return TRANSICIONES_OFICIALES.filter((item) => item.team === team)
  return rows.map(mapTransition)
}

async function politica(team: TeamName, typeId: string, priority: string) {
  const especifica = await prisma.slaPolicy.findFirst({ where: { team, typeId, priority, active: true } })
  if (especifica) return especifica
  return prisma.slaPolicy.findFirst({ where: { team, typeId: null, priority, active: true } })
}

function acceso(request: {
  id: string
  team: TeamName
  status: string
  requesterId: string
  assigneeId: string | null
  resolvedAt?: Date | null
}) {
  return request
}

export async function radicar(
  actor: Actor,
  input: {
    title: string
    description: string
    team: TeamName
    typeId: string
    priority: string
    brand: string
    justification?: string
    desiredDate?: string | null
    stepsToReproduce?: string
    channels?: string
    publishAt?: string | null
    moduleName?: string
    declares: boolean
    reviewedPersonalData?: boolean
  },
  deps?: Deps,
) {
  if (!puedeRadicar(actor)) throw new DomainError("Su perfil no puede radicar requerimientos.")
  if (!input.declares) throw new DomainError("Confirme que este requerimiento no contiene datos personales sensibles.")
  const texto = `${input.title}\n${input.description}\n${input.justification ?? ""}\n${input.stepsToReproduce ?? ""}`
  if (pareceDatoPersonal(texto) && !input.reviewedPersonalData) {
    throw new DomainError("El texto parece incluir una cédula o un celular. Revíselo y confirme que no hay datos personales, o quite ese dato.")
  }
  if (input.priority === "CRITICA" && (input.justification ?? "").trim().length < 8) {
    throw new DomainError("Si la prioridad es crítica, explique la justificación y qué pasa si no se hace.")
  }
  const type = await prisma.requestType.findFirst({ where: { id: input.typeId, active: true } })
  if (!type || type.team !== input.team) throw new DomainError("Elija un tipo de requerimiento del área.")
  if (type.extra === "pasos" && (input.stepsToReproduce ?? "").trim().length < 8) {
    throw new DomainError("Describa los pasos para reproducir el error, con datos de prueba.")
  }
  const area = await prisma.area.findFirst({ where: { id: actor.areaId, active: true } })
  if (!area) throw new DomainError("Su usuario no tiene un área activa.")
  const now = clock(deps)
  let desired: Date | null = null
  if (input.desiredDate) {
    const parsed = DateTime.fromISO(input.desiredDate, { zone: ZONE }).startOf("day")
    if (!parsed.isValid) throw new DomainError("La fecha deseada no es válida.")
    if (parsed < DateTime.fromJSDate(now).setZone(ZONE).startOf("day")) {
      throw new DomainError("La fecha deseada no puede ser anterior a la radicación.")
    }
    desired = parsed.toJSDate()
  }
  const policy = await politica(input.team, type.id, input.priority)
  const firstMinutes = policy?.firstResponseMinutes ?? 8 * 60
  const resolutionMinutes = policy?.resolutionMinutes ?? 40 * 60
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const request = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, input.team)
    const created = await tx.request.create({
      data: {
        code,
        title: input.title,
        description: input.description,
        expectedResult: input.justification ?? "",
        justification: input.justification ?? "",
        brand: input.brand,
        priority: input.priority,
        prioritySuggested: input.priority,
        team: input.team,
        status: "NUEVO",
        desiredDate: desired,
        typeId: type.id,
        areaId: area.id,
        requesterId: actor.id,
        stepsToReproduce: input.stepsToReproduce ?? "",
        channels: input.channels ?? "",
        publishAt: input.publishAt ? new Date(input.publishAt) : null,
        moduleName: input.moduleName ?? "",
        declaresNoPersonalData: true,
        slaStartedAt: now,
        slaTargetMinutes: resolutionMinutes,
        firstResponseMinutes: firstMinutes,
        resolutionMinutes,
        firstResponseDueAt: addBusinessMinutes(now, firstMinutes),
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
        toValue: "NUEVO",
        createdAt: now,
      },
    })
    const body = [
      `${actor.name} radicó ${code} para ${TEAM_LABEL[input.team]}.`,
      input.title,
      `Prioridad sugerida: ${input.priority}.`,
      "Consulte el detalle con su sesión. Este correo no incluye adjuntos.",
      link(code),
    ].join("\n")
    await fanout(tx, await leaderIds(tx, input.team), {
      requestId: created.id,
      subject: `${code} · requerimiento radicado`,
      body,
    }, messages, actor.id)
    return created
  })
  await deliver(email, messages)
  return request
}

export async function transicionar(
  actor: Actor,
  requestId: string,
  name: string,
  comment: string | null,
  extra?: { deliveryUrl?: string },
  deps?: Deps,
) {
  const current = await prisma.request.findUnique({
    where: { id: requestId },
    include: { type: true, attachments: true },
  })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeVer(actor, current)) throw new DomainError("No puede ver este requerimiento.")
  const now = clock(deps)
  const catalogo = await catalogoDe(current.team)
  const transition = encontrarTransicion(actor, acceso(current), name, catalogo, now)
  if (!transition) throw new DomainError("No puede ejecutar esa transición.")
  const note = comment?.trim() ?? ""
  if (transition.requiresComment && note.length < 2) throw new DomainError("Escriba el motivo o la pregunta. Queda visible para el solicitante.")
  if (transition.requiresAssignee && !current.assigneeId) throw new DomainError("Asigne un responsable antes de aprobar.")
  if (transition.requiresCommittedDate && !current.committedDate) throw new DomainError("Defina la fecha comprometida antes de aprobar.")
  const delivery = (extra?.deliveryUrl || current.deliveryUrl || "").trim()
  if (transition.requiresDelivery && !delivery && current.attachments.length === 0) {
    throw new DomainError("Agregue un enlace o un adjunto de la entrega.")
  }
  const destino = transition.toPrevious ? (current.previousStatus || "NUEVO") : transition.to
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.RequestUpdateInput = { status: destino, updatedAt: now }
    if (destino === "EN_ESPERA") data.previousStatus = current.status
    if (transition.toPrevious) data.previousStatus = null
    const entraPausa = !PAUSE_STATUSES.has(current.status) && PAUSE_STATUSES.has(destino)
    const salePausa = PAUSE_STATUSES.has(current.status) && !PAUSE_STATUSES.has(destino)
    if (entraPausa) await tx.slaPause.create({ data: { requestId: current.id, startedAt: now, reason: destino } })
    if (salePausa) await tx.slaPause.updateMany({ where: { requestId: current.id, endedAt: null }, data: { endedAt: now } })
    if (transition.resolution) {
      data.resolution = transition.resolution
      data.resolvedAt = now
      data.closedAt = now
    }
    if (transition.clearResolution) {
      data.resolution = null
      data.resolvedAt = null
      data.closedAt = null
      data.slaStartedAt = now
      data.firstResponseStoppedAt = null
      data.firstResponseMet = null
      data.firstResponseDueAt = addBusinessMinutes(now, current.firstResponseMinutes)
    }
    if (transition.slaEffect === "STOP_FIRST" && !current.firstResponseStoppedAt) {
      data.firstResponseStoppedAt = now
      data.firstResponseMet = current.firstResponseDueAt ? now.getTime() <= current.firstResponseDueAt.getTime() : true
    }
    if (transition.incrementRounds) data.adjustmentRounds = { increment: 1 }
    if (delivery && transition.requiresDelivery) data.deliveryUrl = delivery
    const saved = await tx.request.update({ where: { id: current.id }, data })
    await tx.activity.create({
      data: {
        requestId: current.id,
        actorId: actor.id,
        kind: "STATUS",
        field: "estado",
        message: note ? `${transition.name}: ${note}` : `${transition.name}.`,
        fromValue: current.status,
        toValue: destino,
        createdAt: now,
      },
    })
    if (note) {
      await tx.comment.create({
        data: { requestId: current.id, authorId: actor.id, body: note, internal: false, createdAt: now },
      })
    }
    const leaders = await leaderIds(tx, current.team)
    const avisoRondas = transition.incrementRounds && current.adjustmentRounds >= 2
    const body = [
      `${actor.name} ejecutó «${transition.name}» en ${current.code}: ${statusLabel(current.status)} → ${nombreEstado(current.team, destino)}.`,
      note,
      avisoRondas ? "Ya se usaron las rondas de ajuste sugeridas (2). El líder debe acordar el alcance." : "",
      link(current.code),
    ].filter(Boolean).join("\n")
    await fanout(tx, [current.requesterId, current.assigneeId, ...leaders], {
      requestId: current.id,
      subject: `${current.code} · ${nombreEstado(current.team, destino)}`,
      body,
    }, messages, actor.id)
    return saved
  })
  await deliver(email, messages)
  return updated
}

export async function comentar(actor: Actor, requestId: string, body: string, internal: boolean, deps?: Deps) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeComentar(actor, current, internal)) {
    throw new DomainError(internal ? "Las notas internas son solo del equipo del área." : "No puede comentar en este requerimiento.")
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
    const leaders = await leaderIds(tx, current.team)
    const vuelve = !internal && current.status === "EN_ESPERA" && actor.id === current.requesterId && current.previousStatus
    if (vuelve && current.previousStatus) {
      await tx.slaPause.updateMany({ where: { requestId, endedAt: null }, data: { endedAt: now } })
      await tx.request.update({
        where: { id: requestId },
        data: { status: current.previousStatus, previousStatus: null, updatedAt: now },
      })
      await tx.activity.create({
        data: {
          requestId,
          actorId: actor.id,
          kind: "STATUS",
          field: "estado",
          message: "La respuesta del solicitante reanudó el requerimiento.",
          fromValue: "EN_ESPERA",
          toValue: current.previousStatus,
          createdAt: now,
        },
      })
    } else {
      await tx.request.update({ where: { id: requestId }, data: { updatedAt: now } })
    }
    if (!internal && !current.firstResponseStoppedAt && actor.id !== current.requesterId && (rolEn(actor, current.team) || esAdmin(actor))) {
      await tx.request.update({
        where: { id: requestId },
        data: {
          firstResponseStoppedAt: now,
          firstResponseMet: current.firstResponseDueAt ? now.getTime() <= current.firstResponseDueAt.getTime() : true,
        },
      })
    }
    const destinatarios = internal
      ? [current.assigneeId, ...leaders]
      : current.status === "CERRADO" || TERMINAL_STATUSES.has(current.status)
        ? leaders
        : [actor.id === current.requesterId ? current.assigneeId : current.requesterId, ...leaders]
    await fanout(tx, destinatarios, {
      requestId,
      subject: `${current.code} · ${internal ? "nota interna" : "comentario"}`,
      body: `${actor.name} escribió en ${current.code}. Abra el requerimiento con su sesión; este correo no incluye el texto de notas internas ni adjuntos.\n${link(current.code)}`,
    }, messages, actor.id)
    return created
  })
  await deliver(email, messages)
  return comment
}

export async function asignar(actor: Actor, requestId: string, assigneeId: string, deps?: Deps) {
  const current = await prisma.request.findUnique({ where: { id: requestId }, include: { area: true } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  const self = actor.id === assigneeId
  if (self && !puedeAutoasignarse(actor, current, current.area.allowSelfAssign) && !puedeAsignar(actor, current) && !esAdmin(actor)) {
    throw new DomainError("El líder no habilitó la autoasignación.")
  }
  if (!self && !puedeAsignar(actor, current)) throw new DomainError("Solo el líder del área asigna el responsable.")
  const assignee = await prisma.user.findFirst({
    where: { id: assigneeId, active: true, areaRoles: { some: { team: current.team, role: { in: ["AGENTE", "LIDER"] } } } },
  })
  if (!assignee) throw new DomainError("Elija un agente o líder activo de esa área.")
  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.request.update({ where: { id: requestId }, data: { assigneeId: assignee.id, updatedAt: now } })
    await tx.activity.create({
      data: {
        requestId,
        actorId: actor.id,
        kind: "ASSIGN",
        field: "responsable",
        message: `Asignó el requerimiento a ${assignee.name}.`,
        fromValue: current.assigneeId,
        toValue: assignee.id,
        createdAt: now,
      },
    })
    await fanout(tx, [assignee.id, current.requesterId], {
      requestId,
      subject: `${current.code} · responsable asignado`,
      body: `${assignee.name} quedó como responsable de ${current.code}.\n${link(current.code)}`,
    }, messages, actor.id)
    return saved
  })
  await deliver(email, messages)
  return updated
}

export async function editarCampos(
  actor: Actor,
  requestId: string,
  input: { title?: string; description?: string; typeId?: string; brand?: string; priority?: string; committedDate?: string | null; moduleName?: string },
  deps?: Deps,
) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeEditarCampos(actor, current)) throw new DomainError("No puede editar este requerimiento.")
  const now = clock(deps)
  const data: Prisma.RequestUpdateInput = { updatedAt: now }
  const cambios: Array<{ field: string; from: string; to: string; message: string }> = []
  const propioNuevo = actor.id === current.requesterId && current.status === "NUEVO" && !esAdmin(actor) && rolEn(actor, current.team) !== "LIDER"
  if (input.title && input.title !== current.title) {
    if (propioNuevo || puedeCambiarPrioridad(actor, current.team) || esAdmin(actor) || rolEn(actor, current.team) === "LIDER") {
      data.title = input.title.trim()
      cambios.push({ field: "titulo", from: current.title, to: input.title.trim(), message: "Cambió el título." })
    }
  }
  if (input.description && input.description !== current.description) {
    data.description = input.description.trim()
    cambios.push({ field: "descripcion", from: current.description, to: input.description.trim(), message: "Cambió la descripción." })
  }
  if (input.typeId && input.typeId !== current.typeId) {
    if (!puedeCambiarPrioridad(actor, current.team)) throw new DomainError("Solo el líder cambia el tipo.")
    const type = await prisma.requestType.findFirst({ where: { id: input.typeId, team: current.team, active: true } })
    if (!type) throw new DomainError("Ese tipo no pertenece al área.")
    data.type = { connect: { id: type.id } }
    cambios.push({ field: "tipo", from: current.typeId, to: type.id, message: `Cambió el tipo a ${type.name}.` })
  }
  if (input.brand && input.brand !== current.brand) {
    if (!puedeCambiarPrioridad(actor, current.team)) throw new DomainError("Solo el líder cambia la marca.")
    data.brand = input.brand
    cambios.push({ field: "marca", from: current.brand, to: input.brand, message: "Cambió la marca." })
  }
  if (input.priority && input.priority !== current.priority) {
    if (!puedeCambiarPrioridad(actor, current.team)) throw new DomainError("Solo el líder cambia la prioridad.")
    data.priority = input.priority
    cambios.push({ field: "prioridad", from: current.priority, to: input.priority, message: "Cambió la prioridad." })
  }
  if (input.committedDate !== undefined && puedeCambiarPrioridad(actor, current.team)) {
    const parsed = input.committedDate ? DateTime.fromISO(input.committedDate, { zone: ZONE }).startOf("day").toJSDate() : null
    data.committedDate = parsed
    cambios.push({ field: "fecha_comprometida", from: current.committedDate?.toISOString() ?? "", to: parsed?.toISOString() ?? "", message: "Definió la fecha comprometida." })
  }
  if (input.moduleName !== undefined) data.moduleName = input.moduleName
  if (cambios.length === 0) return current
  return prisma.$transaction(async (tx) => {
    const saved = await tx.request.update({ where: { id: requestId }, data })
    for (const cambio of cambios) {
      await tx.activity.create({
        data: {
          requestId,
          actorId: actor.id,
          kind: "FIELD",
          field: cambio.field,
          message: cambio.message,
          fromValue: cambio.from,
          toValue: cambio.to,
          createdAt: now,
        },
      })
    }
    return saved
  })
}

export async function trasladar(actor: Actor, requestId: string, team: TeamName, deps?: Deps) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeTrasladar(actor, current.team)) throw new DomainError("Solo el líder puede trasladar el requerimiento.")
  if (team === current.team) throw new DomainError("El requerimiento ya está en esa área.")
  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.request.update({
      where: { id: requestId },
      data: { team, status: "NUEVO", assigneeId: null, previousStatus: null, updatedAt: now },
    })
    await tx.activity.create({
      data: {
        requestId,
        actorId: actor.id,
        kind: "FIELD",
        field: "area",
        message: `Trasladó el requerimiento a ${TEAM_LABEL[team]}.`,
        fromValue: current.team,
        toValue: team,
        createdAt: now,
      },
    })
    await fanout(tx, [current.requesterId, ...(await leaderIds(tx, team))], {
      requestId,
      subject: `${current.code} · trasladado a ${TEAM_LABEL[team]}`,
      body: `${current.code} pasó a la cola de ${TEAM_LABEL[team]}.\n${link(current.code)}`,
    }, messages, actor.id)
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
  await mkdir(uploadDir(), { recursive: true })
  await writeFile(path.join(uploadDir(), storedName), file.bytes)
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
        toValue: filename,
        createdAt: now,
      },
    })
    await tx.request.update({ where: { id: requestId }, data: { updatedAt: now } })
    return attachment
  })
}

async function estadosDe(team: TeamName) {
  const rows = await prisma.workflowState.findMany({ where: { team, active: true }, orderBy: { sortOrder: "asc" } })
  return rows
}

export async function getDetalle(actor: Actor, code: string) {
  const request = await prisma.request.findUnique({ where: { code }, include: detailInclude })
  if (!request || !puedeVer(actor, request)) return null
  const seeInternal = puedeVerNotaInterna(actor, request.team)
  const catalogo = await catalogoDe(request.team)
  const agents = puedeAsignar(actor, request) || puedeAutoasignarse(actor, request, true)
    ? await prisma.user.findMany({
        where: { active: true, areaRoles: { some: { team: request.team, role: { in: ["AGENTE", "LIDER"] } } } },
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
    transitions: transicionesPara(actor, acceso(request), catalogo),
    canCommentPublic: puedeComentar(actor, request, false),
    canCommentInternal: puedeComentar(actor, request, true),
    canAssign: puedeAsignar(actor, request),
    canAttach: puedeAdjuntar(actor, request),
    canEdit: puedeEditarCampos(actor, request),
    canPriority: puedeCambiarPrioridad(actor, request.team),
    canMove: puedeTrasladar(actor, request.team),
    seeInternal,
    agents,
    states: await estadosDe(request.team),
    jornada: describeWindows(),
  }
}

function visibilidad(actor: Actor): Prisma.RequestWhereInput {
  if (esAdmin(actor)) return {}
  const teams = [...new Set(actor.memberships.map((item) => item.team))]
  return {
    OR: [
      { requesterId: actor.id },
      ...(teams.length ? [{ team: { in: teams } }] : []),
    ],
  }
}

export type ListQuery = {
  q?: string
  team?: string
  status?: string
  priority?: string
  brand?: string
  typeId?: string
  assigneeId?: string
  requesterId?: string
  mine?: boolean
  assignedToMe?: boolean
  from?: string
  to?: string
  openOnly?: boolean
  closedOnly?: boolean
  queueTeam?: TeamName | null
  onlyNew?: boolean
  sort?: string
  dir?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export async function listar(actor: Actor, query: ListQuery) {
  const pageSize = query.pageSize ?? 50
  const page = Math.max(1, query.page ?? 1)
  const where: Prisma.RequestWhereInput = { AND: [visibilidad(actor)] }
  const and = where.AND as Prisma.RequestWhereInput[]
  if (query.q) {
    and.push({
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { code: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ],
    })
  }
  if (query.team === "DESARROLLO" || query.team === "MARKETING") and.push({ team: query.team })
  if (query.status) and.push({ status: query.status })
  if (query.priority) and.push({ priority: query.priority })
  if (query.brand) and.push({ brand: query.brand })
  if (query.typeId) and.push({ typeId: query.typeId })
  if (query.assigneeId) and.push({ assigneeId: query.assigneeId })
  if (query.requesterId) and.push({ requesterId: query.requesterId })
  if (query.mine) and.push({ requesterId: actor.id })
  if (query.assignedToMe) and.push({ assigneeId: actor.id })
  if (query.queueTeam) and.push({ team: query.queueTeam })
  if (query.onlyNew) and.push({ status: "NUEVO" })
  if (query.openOnly) and.push({ status: { notIn: [...TERMINAL_STATUSES] } })
  if (query.closedOnly) and.push({ status: { in: [...TERMINAL_STATUSES] } })
  if (query.from || query.to) {
    and.push({
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    })
  }
  const sortField = ["updatedAt", "createdAt", "code", "priority", "status"].includes(query.sort || "") ? query.sort! : "updatedAt"
  const [total, rows] = await prisma.$transaction([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      include: { type: true, requester: true, assignee: true, area: true, pauses: true },
      orderBy: { [sortField]: query.dir === "asc" ? "asc" : "desc" },
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

export async function resumen(actor: Actor) {
  const now = new Date()
  const items = await prisma.request.findMany({
    where: { AND: [visibilidad(actor), { status: { notIn: ["CERRADO", "CANCELADO", "RECHAZADO"] } }] },
    include: { pauses: true, type: true, requester: true, assignee: true, area: true },
    orderBy: { updatedAt: "desc" },
  })
  const decorated = items.map((item) => ({ ...item, sla: evaluarSla(item, now) }))
  const abiertos = decorated.filter((item) => !DONE_STATUSES.has(item.status))
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const resueltos7 = await prisma.request.count({
    where: { AND: [visibilidad(actor), { resolvedAt: { gte: since } }] },
  })
  return { items: decorated, abiertos, resueltos7 }
}

export async function dashboard(actor: Actor, filters: { team?: string; brand?: string; from?: string; to?: string }) {
  const now = new Date()
  const from = filters.from ? new Date(filters.from) : new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)
  const to = filters.to ? new Date(filters.to) : now
  const base: Prisma.RequestWhereInput[] = [visibilidad(actor)]
  if (filters.team === "DESARROLLO" || filters.team === "MARKETING") base.push({ team: filters.team })
  if (filters.brand) base.push({ brand: filters.brand })
  if (!esAdmin(actor)) {
    const teams = actor.memberships.map((item) => item.team)
    if (teams.length === 0) base.push({ id: "__ninguno__" })
  }
  const abiertos = await prisma.request.findMany({
    where: { AND: [...base, { status: { notIn: [...TERMINAL_STATUSES] } }] },
    include: { pauses: true, assignee: true, requester: true },
  })
  const decorados = abiertos.map((item) => ({ ...item, sla: evaluarSla(item, now) }))
  const cerrados = await prisma.request.findMany({
    where: { AND: [...base, { resolvedAt: { gte: from, lte: to } }] },
    include: { pauses: true },
  })
  const creados = await prisma.request.findMany({
    where: { AND: [...base, { createdAt: { gte: from, lte: to } }] },
    select: { createdAt: true, team: true, brand: true },
  })
  const cumplidos = cerrados.filter((item) => {
    const snap = evaluarSla(item, item.resolvedAt ?? now)
    return snap.state === "CUMPLIDO"
  }).length
  const semanas: Array<{ label: string; creados: number; resueltos: number }> = []
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(to.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    semanas.push({
      label: new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", timeZone: ZONE }).format(start),
      creados: creados.filter((item) => item.createdAt >= start && item.createdAt < end).length,
      resueltos: cerrados.filter((item) => item.resolvedAt && item.resolvedAt >= start && item.resolvedAt < end).length,
    })
  }
  const porEstado = new Map<string, number>()
  for (const item of decorados) porEstado.set(item.status, (porEstado.get(item.status) ?? 0) + 1)
  return {
    porEstado: [...porEstado.entries()].map(([status, total]) => ({ status, total })),
    semanas,
    cumplimiento: cerrados.length === 0 ? null : Math.round((cumplidos / cerrados.length) * 100),
    vencidos: decorados.filter((item) => item.sla.state === "VENCIDO"),
    abiertos: decorados.length,
  }
}

export async function vigilarSlas(deps?: Deps) {
  const now = clock(deps)
  const email = mailer(deps)
  const open = await prisma.request.findMany({
    where: { status: { notIn: [...TERMINAL_STATUSES] } },
    include: { pauses: true },
  })
  let sent = 0
  for (const request of open) {
    const sla = evaluarSla(request, now)
    if (sla.state !== "VENCIDO") continue
    const messages: EmailMessage[] = []
    const leaders = (await prisma.areaRole.findMany({ where: { team: request.team, role: "LIDER" }, select: { userId: true } })).map((item) => item.userId)
    await prisma.$transaction(async (tx) => {
      await fanout(tx, [request.assigneeId, ...leaders], {
        requestId: request.id,
        subject: `${request.code} · SLA de solución vencido`,
        body: `${request.code} venció el SLA de solución.\n${link(request.code)}`,
        dedupeKey: `sla-VENCIDO-${request.id}`,
      }, messages)
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
  await prisma.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } })
}

export async function guardarRoles(
  actor: Actor,
  userId: string,
  input: { isAdmin: boolean; active: boolean; areaId: string; memberships: { team: TeamName; role: "AGENTE" | "LIDER" | "OBSERVADOR" }[] },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador asigna roles.")
  if (userId === actor.id && !input.active) throw new DomainError("No puede desactivar su propio usuario.")
  const area = await prisma.area.findFirst({ where: { id: input.areaId, active: true } })
  if (!area) throw new DomainError("Elija un área del perfil.")
  const before = await prisma.areaRole.findMany({ where: { userId } })
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: input.isAdmin ? "ADMINISTRADOR" : "SOLICITANTE", active: input.active, areaId: area.id, team: null },
    })
    await tx.areaRole.deleteMany({ where: { userId } })
    if (input.memberships.length) {
      await tx.areaRole.createMany({
        data: input.memberships.map((item) => ({ userId, team: item.team, role: item.role })),
      })
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CAMBIO_ROL",
        entity: "User",
        entityId: userId,
        fromValue: JSON.stringify(before.map((item) => `${item.role}:${item.team}`)),
        toValue: JSON.stringify([...(input.isAdmin ? ["ADMINISTRADOR"] : []), ...input.memberships.map((item) => `${item.role}:${item.team}`)]),
      },
    })
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
  input: { team: TeamName; name: string; description: string; extra: string },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona el catálogo.")
  const name = input.name.trim()
  if (name.length < 3) throw new DomainError("Complete el nombre del tipo.")
  try {
    return await prisma.requestType.create({
      data: { team: input.team, name, description: input.description.trim() || name, extra: input.extra },
    })
  } catch {
    throw new DomainError("Ya existe ese tipo en el área.")
  }
}

export async function actualizarTipo(actor: Actor, id: string, input: { description: string; extra: string; active: boolean }) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona el catálogo.")
  return prisma.requestType.update({
    where: { id },
    data: { description: input.description.trim(), extra: input.extra, active: input.active },
  })
}

export async function catalogos() {
  const [areas, types, users, marcas, prioridades, politicas, estados, transiciones, auditoria] = await Promise.all([
    prisma.area.findMany({ orderBy: { name: "asc" } }),
    prisma.requestType.findMany({ orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({ include: { area: true, areaRoles: true }, orderBy: { name: "asc" } }),
    prisma.catalogItem.findMany({ where: { kind: "MARCA" }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { kind: "PRIORIDAD" }, orderBy: { sortOrder: "asc" } }),
    prisma.slaPolicy.findMany({ include: { type: true }, orderBy: [{ team: "asc" }, { priority: "asc" }] }),
    prisma.workflowState.findMany({ orderBy: [{ team: "asc" }, { sortOrder: "asc" }] }),
    prisma.workflowTransition.findMany({ orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 30 }),
  ])
  return { areas, types, users, marcas, prioridades, politicas, estados, transiciones, auditoria }
}

export async function guardarEstado(
  actor: Actor,
  input: { id?: string; team: TeamName; key: string; name: string; category: string; boardColumn: string },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador configura flujos.")
  const key = input.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")
  if (!key || input.name.trim().length < 2) throw new DomainError("Indique la clave y el nombre del estado.")
  const last = await prisma.workflowState.findFirst({ where: { team: input.team }, orderBy: { sortOrder: "desc" } })
  if (input.id) {
    return prisma.workflowState.update({
      where: { id: input.id },
      data: { name: input.name.trim(), category: input.category, boardColumn: input.boardColumn.trim() || input.name.trim() },
    })
  }
  return prisma.workflowState.create({
    data: {
      team: input.team,
      key,
      name: input.name.trim(),
      category: input.category,
      boardColumn: input.boardColumn.trim() || input.name.trim(),
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  })
}

export async function eliminarEstado(actor: Actor, id: string, moveToKey?: string) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador configura flujos.")
  const state = await prisma.workflowState.findUnique({ where: { id } })
  if (!state) throw new DomainError("El estado no existe.")
  const usados = await prisma.request.count({ where: { team: state.team, status: state.key } })
  if (usados > 0) {
    if (!moveToKey || moveToKey === state.key) throw new DomainError("Ese estado tiene requerimientos. Indique a cuál moverlos antes de eliminarlo.")
    const destino = await prisma.workflowState.findFirst({ where: { team: state.team, key: moveToKey, active: true } })
    if (!destino) throw new DomainError("El estado de destino no existe.")
    await prisma.request.updateMany({ where: { team: state.team, status: state.key }, data: { status: moveToKey } })
  }
  await prisma.workflowState.delete({ where: { id } })
}

export async function guardarTransicion(
  actor: Actor,
  input: {
    id?: string
    team: TeamName
    name: string
    fromKeys: string
    toKey: string
    allowedRoles: string
    requiresComment: boolean
    requiresAssignee: boolean
    requiresCommittedDate: boolean
    requiresDelivery: boolean
    slaEffect: string
  },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador configura flujos.")
  const data = {
    name: input.name.trim(),
    fromKeys: input.fromKeys,
    toKey: input.toKey,
    allowedRoles: input.allowedRoles,
    requiresComment: input.requiresComment,
    requiresAssignee: input.requiresAssignee,
    requiresCommittedDate: input.requiresCommittedDate,
    requiresDelivery: input.requiresDelivery,
    slaEffect: input.slaEffect,
  }
  if (input.id) return prisma.workflowTransition.update({ where: { id: input.id }, data })
  return prisma.workflowTransition.create({ data: { team: input.team, ...data } })
}

export async function guardarSla(
  actor: Actor,
  input: { id?: string; team: TeamName; priority: string; typeId?: string | null; firstResponseMinutes: number; resolutionMinutes: number },
) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador define el SLA.")
  if (input.firstResponseMinutes < 15 || input.resolutionMinutes < 15) throw new DomainError("Las metas se miden en minutos hábiles y deben ser de al menos 15.")
  const data = {
    team: input.team,
    priority: input.priority,
    typeId: input.typeId || null,
    firstResponseMinutes: input.firstResponseMinutes,
    resolutionMinutes: input.resolutionMinutes,
  }
  if (input.id) return prisma.slaPolicy.update({ where: { id: input.id }, data })
  return prisma.slaPolicy.create({ data })
}

export async function alternarCatalogo(actor: Actor, id: string, active: boolean) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona el catálogo.")
  return prisma.catalogItem.update({ where: { id }, data: { active } })
}
