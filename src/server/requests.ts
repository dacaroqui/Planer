import { randomUUID } from "node:crypto"
import { DateTime } from "luxon"
import { Prisma, type Team } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { appBaseUrl, createEmailProvider, type EmailMessage, type EmailProvider } from "@/lib/email"
import { obtenerAlmacen } from "@/lib/almacen"
import { dentroDeVentanaDeshacer } from "@/lib/tablero-movimiento"
import { assertAllowedFile, safeFilename } from "@/lib/files"
import { pareceDatoPersonal } from "@/lib/datos-personales"
import {
  DONE_STATUSES,
  DomainError,
  PermisoDenegado,
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
import { esEntradaPublica, horasDeMinutos, notaResolucionOpcional, visibilidadDefecto, type TipoComentario } from "@/lib/cronologia"
import { snapshotSolucion } from "@/lib/sla-solicitud"
import { addBusinessMinutes, describeWindows } from "@/lib/sla"
import { ZONE } from "@/lib/time"

type Tx = Prisma.TransactionClient
export type Deps = { email?: EmailProvider; now?: Date }

const detailInclude = {
  type: true,
  area: true,
  requester: true,
  assignee: true,
  empresa: true,
  project: true,
  tasks: { include: { assignee: true }, orderBy: { createdAt: "asc" as const } },
  comments: { include: { author: { include: { areaRoles: true } }, tarea: { select: { title: true } } }, orderBy: { createdAt: "asc" as const } },
  activities: { include: { actor: { include: { areaRoles: true } } }, orderBy: { createdAt: "asc" as const } },
  attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" as const } },
  pauses: { orderBy: { startedAt: "asc" as const } },
} satisfies Prisma.RequestInclude

function clock(deps?: Deps) {
  return deps?.now ?? new Date()
}

function limiteFecha(valor: string, fin: boolean, calendario: boolean) {
  if (calendario && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const dia = DateTime.fromISO(valor, { zone: ZONE })
    return (fin ? dia.endOf("day") : dia.startOf("day")).toJSDate()
  }
  return new Date(valor)
}
function mailer(deps?: Deps) {
  return deps?.email ?? createEmailProvider()
}
function link(code: string) {
  return `${appBaseUrl()}/requerimientos/${code}`
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
  const { snap: solution } = snapshotSolucion(request, now)
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
    empresaId?: string
    projectId?: string | null
    justification?: string
    desiredDate?: string | null
    stepsToReproduce?: string
    channels?: string
    publishAt?: string | null
    moduleName?: string
    declares: boolean
    reviewedPersonalData?: boolean
    areaId?: string
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
  if (type.extra === "canal" && ((input.channels ?? "").trim().length < 2 || !(input.publishAt ?? "").trim())) {
    throw new DomainError("Indique el canal y la fecha de publicación.")
  }
  const areaElegida = actor.isAdmin && input.areaId ? input.areaId : actor.areaId
  const area = await prisma.area.findFirst({ where: { id: areaElegida, active: true } })
  if (!area) throw new DomainError("Elija un área activa. El administrador no radica en Académico por defecto.")
  const empresa = input.empresaId
    ? await prisma.empresa.findFirst({ where: { id: input.empresaId, active: true } })
    : await prisma.empresa.findFirst({
        where: { name: input.brand === "LUVANIA" ? "Luvania" : "CIFES", active: true },
      }) ?? await prisma.empresa.findFirst({ where: { active: true }, orderBy: { name: "asc" } })
  if (!empresa) throw new DomainError("Elija una empresa activa.")
  let projectId: string | null = null
  if (input.projectId) {
    const proyecto = await prisma.proyecto.findFirst({ where: { id: input.projectId, empresaId: empresa.id } })
    if (!proyecto) throw new DomainError("El proyecto no pertenece a la empresa elegida.")
    projectId = proyecto.id
  }
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
        empresaId: empresa.id,
        projectId,
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
  void deliver(email, messages)
  return request
}

export async function transicionar(
  actor: Actor,
  requestId: string,
  name: string,
  comment: string | null,
  extra?: { deliveryUrl?: string; projectId?: string | null; assigneeId?: string | null; committedDate?: string | null; resolution?: string | null; visibilidad?: "publica" | "interna"; resolutionNote?: string | null },
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
  const destinoNota = transition.toPrevious ? (current.previousStatus || "NUEVO") : transition.to
  const entregaOCierre = notaResolucionOpcional({ name: transition.name, to: destinoNota })
  if (transition.requiresComment && note.length < 2 && !entregaOCierre) throw new DomainError("Escriba el motivo o la pregunta. Queda visible para el solicitante.")
  const assigneeId = extra?.assigneeId || current.assigneeId
  if (transition.requiresAssignee && !assigneeId) throw new DomainError("Elija un responsable antes de aprobar.")
  const committed = extra?.committedDate || (current.committedDate ? current.committedDate.toISOString().slice(0, 10) : "")
  if (transition.requiresCommittedDate && !committed) throw new DomainError("Defina la fecha comprometida antes de aprobar.")
  let projectId = current.projectId
  if (extra?.projectId) {
    const proyecto = await prisma.proyecto.findFirst({ where: { id: extra.projectId, empresaId: current.empresaId } })
    if (!proyecto) throw new DomainError("El proyecto no pertenece a la empresa del requerimiento.")
    projectId = proyecto.id
  }
  const destinoPrevisto = transition.toPrevious ? (current.previousStatus || "NUEVO") : transition.to
  if (current.status === "NUEVO" && destinoPrevisto !== "NUEVO" && !projectId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: current.empresaId } })
    if (empresa?.exigirProyectoAlClasificar) {
      throw new DomainError("Esta empresa exige un proyecto antes de salir de Nuevo.")
    }
  }
  const delivery = (extra?.deliveryUrl || current.deliveryUrl || "").trim()
  if (transition.requiresDelivery && !delivery && current.attachments.length === 0) {
    throw new DomainError("Agregue un enlace o un adjunto de la entrega.")
  }
    const destino = destinoPrevisto
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.RequestUpdateInput = {
      status: destino,
      updatedAt: now,
      ...(projectId && projectId !== current.projectId ? { project: { connect: { id: projectId } } } : {}),
      ...(extra?.assigneeId && extra.assigneeId !== current.assigneeId ? { assignee: { connect: { id: extra.assigneeId } } } : {}),
      ...(extra?.committedDate ? { committedDate: new Date(extra.committedDate) } : {}),
    }
    if (destino === "EN_ESPERA") data.previousStatus = current.status
    if (transition.toPrevious) data.previousStatus = null
    const entraPausa = !PAUSE_STATUSES.has(current.status) && PAUSE_STATUSES.has(destino)
    const salePausa = PAUSE_STATUSES.has(current.status) && !PAUSE_STATUSES.has(destino)
    if (entraPausa) await tx.slaPause.create({ data: { requestId: current.id, startedAt: now, reason: destino } })
    if (salePausa) await tx.slaPause.updateMany({ where: { requestId: current.id, endedAt: null }, data: { endedAt: now } })
    const resoluciones = new Set(["RESUELTO", "NO_SE_HARA", "DUPLICADO", "CANCELADO_SOLICITANTE"])
    const resolucionElegida = extra?.resolution && resoluciones.has(extra.resolution) ? extra.resolution : null
    const cierra = destino === "CERRADO" || destino === "RECHAZADO" || destino === "CANCELADO"
    if (transition.resolution || (resolucionElegida && cierra)) {
      data.resolution = resolucionElegida || transition.resolution
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
    const visibilidad = extra?.visibilidad ?? visibilidadDefecto(transition.name)
    const kind: TipoComentario = visibilidad === "interna"
      ? "INTERNA"
      : transition.name === "Pedir información" ? "SOLICITUD_INFO" : "PUBLICA"
    const notaHecho = (extra?.resolutionNote ?? (entregaOCierre ? note : "")).trim()
    if (entregaOCierre) data.resolutionNote = notaHecho || null
    if (note && esEntradaPublica(kind)) {
      data.lastPublicActor = { connect: { id: actor.id } }
      data.lastPublicAt = now
    }
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
        data: { requestId: current.id, authorId: actor.id, body: note, kind, internal: kind === "INTERNA", createdAt: now },
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

export async function deshacerTransicion(actor: Actor, requestId: string, deps?: Deps) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  if (!puedeVer(actor, current)) throw new DomainError("No puede ver este requerimiento.")
  const last = await prisma.activity.findFirst({
    where: { requestId, kind: "STATUS", field: "estado" },
    orderBy: { createdAt: "desc" },
  })
  if (!last?.fromValue || !last.toValue) throw new DomainError("No hay un cambio de estado para deshacer.")
  if (last.toValue !== current.status) throw new DomainError("Ese cambio ya no es el último.")
  const ahora = clock(deps)
  if (!dentroDeVentanaDeshacer(last.createdAt.getTime(), ahora.getTime())) {
    throw new DomainError("Ya pasó el tiempo para deshacer.")
  }
  const puede = esAdmin(actor) || rolEn(actor, current.team) === "LIDER" || last.actorId === actor.id
  if (!puede) throw new DomainError("No puede deshacer ese cambio.")
  const destino = last.fromValue
  const origen = last.toValue
  await prisma.$transaction(async (tx) => {
    const data: Prisma.RequestUpdateInput = { status: destino, updatedAt: ahora }
    if (TERMINAL_STATUSES.has(origen) && !TERMINAL_STATUSES.has(destino)) {
      data.resolution = null
      data.resolvedAt = null
      data.closedAt = null
    }
    if (PAUSE_STATUSES.has(origen) && !PAUSE_STATUSES.has(destino)) {
      await tx.slaPause.deleteMany({ where: { requestId, endedAt: null, reason: origen } })
    }
    await tx.request.update({ where: { id: requestId }, data })
    await tx.activity.create({
      data: {
        requestId,
        actorId: actor.id,
        kind: "STATUS",
        field: "estado",
        message: "Deshizo el cambio de estado.",
        fromValue: current.status,
        toValue: destino,
        createdAt: ahora,
      },
    })
  })
}

export async function comentar(actor: Actor, requestId: string, body: string, internal: boolean, deps?: Deps) {
  return registrarEntrada(actor, requestId, { kind: internal ? "INTERNA" : "PUBLICA", body }, deps)
}

export async function registrarEntrada(
  actor: Actor,
  requestId: string,
  input: { kind: TipoComentario; body: string; minutes?: number | null; tareaId?: string | null; compartir?: boolean },
  deps?: Deps,
) {
  const current = await prisma.request.findUnique({ where: { id: requestId } })
  if (!current) throw new DomainError("El requerimiento no existe.")
  const interno = input.kind !== "PUBLICA"
  if (input.kind !== "PUBLICA" && !puedeVerNotaInterna(actor, current.team)) {
    throw new DomainError("Esa entrada es solo del equipo del área.")
  }
  if (!puedeComentar(actor, current, input.kind === "INTERNA" || input.kind === "REGISTRO")) {
    throw new DomainError(interno ? "Las notas internas son solo del equipo del área." : "No puede comentar en este requerimiento.")
  }
  const text = input.body.trim()
  if (text.length < 2) throw new DomainError("Escriba un comentario.")
  const minutes = input.kind === "REGISTRO" ? Number(input.minutes ?? 0) : null
  if (input.kind === "REGISTRO" && (!Number.isFinite(minutes) || (minutes ?? 0) <= 0)) {
    throw new DomainError("Indique los minutos trabajados.")
  }
  if (input.tareaId) {
    const tarea = await prisma.tarea.findFirst({ where: { id: input.tareaId, requestId } })
    if (!tarea) throw new DomainError("La tarea no pertenece a este requerimiento.")
  }
  const now = clock(deps)
  const email = mailer(deps)
  const messages: EmailMessage[] = []
  const publica = esEntradaPublica(input.kind)
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        requestId,
        authorId: actor.id,
        body: text,
        kind: input.kind,
        internal: input.kind === "INTERNA",
        minutes: input.kind === "REGISTRO" ? Math.round(minutes ?? 0) : null,
        tareaId: input.kind === "REGISTRO" ? (input.tareaId || null) : null,
        compartir: input.kind === "REGISTRO" && Boolean(input.compartir),
        createdAt: now,
      },
    })
    if (input.kind === "REGISTRO" && input.tareaId) {
      const suma = await tx.comment.aggregate({ where: { tareaId: input.tareaId, kind: "REGISTRO" }, _sum: { minutes: true } })
      await tx.tarea.update({ where: { id: input.tareaId }, data: { horasReales: horasDeMinutos(suma._sum.minutes ?? 0) } })
    }
    const mensaje = input.kind === "REGISTRO"
      ? "Registró trabajo."
      : input.kind === "SOLICITUD_INFO"
        ? "Pidió información al solicitante."
        : input.kind === "INTERNA"
          ? "Dejó una nota interna."
          : "Comentó en el requerimiento."
    await tx.activity.create({
      data: { requestId, actorId: actor.id, kind: "COMMENT", message: mensaje, internal: input.kind === "INTERNA", createdAt: now },
    })
    const leaders = await leaderIds(tx, current.team)
    const publicoDelSolicitante = publica && actor.id === current.requesterId
    const vuelve = publicoDelSolicitante && current.status === "EN_ESPERA" && current.previousStatus
    const pideInfo = input.kind === "SOLICITUD_INFO" && !PAUSE_STATUSES.has(current.status)
    const marcaPublica = publica ? { lastPublicActorId: actor.id, lastPublicAt: now } : {}
    if (vuelve && current.previousStatus) {
      await tx.slaPause.updateMany({ where: { requestId, endedAt: null }, data: { endedAt: now } })
      await tx.request.update({
        where: { id: requestId },
        data: { status: current.previousStatus, previousStatus: null, updatedAt: now, ...marcaPublica },
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
    } else if (pideInfo) {
      await tx.slaPause.create({ data: { requestId, startedAt: now, reason: "EN_ESPERA" } })
      await tx.request.update({
        where: { id: requestId },
        data: { status: "EN_ESPERA", previousStatus: current.status, updatedAt: now, ...marcaPublica },
      })
      await tx.activity.create({
        data: {
          requestId,
          actorId: actor.id,
          kind: "STATUS",
          field: "estado",
          message: "Pidió información y pausó el SLA.",
          fromValue: current.status,
          toValue: "EN_ESPERA",
          createdAt: now,
        },
      })
    } else {
      await tx.request.update({ where: { id: requestId }, data: { updatedAt: now, ...marcaPublica } })
    }
    if (publica && !current.firstResponseStoppedAt && actor.id !== current.requesterId && (rolEn(actor, current.team) || esAdmin(actor))) {
      await tx.request.update({
        where: { id: requestId },
        data: {
          firstResponseStoppedAt: now,
          firstResponseMet: current.firstResponseDueAt ? now.getTime() <= current.firstResponseDueAt.getTime() : true,
        },
      })
    }
    const destinatarios = input.kind === "INTERNA" || input.kind === "REGISTRO"
      ? [current.assigneeId, ...leaders]
      : TERMINAL_STATUSES.has(current.status)
        ? leaders
        : [actor.id === current.requesterId ? current.assigneeId : current.requesterId, ...leaders]
    const asunto = publicoDelSolicitante
      ? `${current.code} · El solicitante respondió`
      : input.kind === "SOLICITUD_INFO"
        ? `${current.code} · información solicitada`
        : `${current.code} · ${input.kind === "INTERNA" ? "nota interna" : input.kind === "REGISTRO" ? "registro de trabajo" : "comentario"}`
    await fanout(tx, destinatarios, {
      requestId,
      subject: asunto,
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
    where: esAdmin(actor)
      ? {
          id: assigneeId,
          active: true,
          OR: [
            { role: "ADMINISTRADOR" },
            { areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } },
          ],
        }
      : { id: assigneeId, active: true, areaRoles: { some: { team: current.team, role: { in: ["AGENTE", "LIDER"] } } } },
  })
  if (!assignee) {
    const persona = await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, active: true } })
    if (!persona?.active) throw new DomainError("Esa persona no está activa.")
    throw new DomainError(`${persona.name} no es agente ni líder de ${TEAM_LABEL[current.team]}.`)
  }
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
    await fanout(tx, [assignee.id], {
      requestId,
      subject: `${current.code} · Se te asignó`,
      body: `Se te asignó ${current.code}.\n${link(current.code)}`,
    }, messages, actor.id)
    await fanout(tx, [current.requesterId], {
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
  input: { title?: string; description?: string; typeId?: string; brand?: string; priority?: string; committedDate?: string | null; moduleName?: string; projectId?: string | null },
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
  if (input.projectId !== undefined && input.projectId !== current.projectId) {
    if (!puedeCambiarPrioridad(actor, current.team) && !esAdmin(actor)) {
      throw new DomainError("Solo el líder asocia el proyecto al clasificar.")
    }
    if (input.projectId) {
      const proyecto = await prisma.proyecto.findFirst({ where: { id: input.projectId, empresaId: current.empresaId } })
      if (!proyecto) throw new DomainError("El proyecto no pertenece a la empresa del requerimiento.")
      data.project = { connect: { id: proyecto.id } }
      cambios.push({ field: "proyecto", from: current.projectId ?? "", to: proyecto.id, message: `Asoció el proyecto ${proyecto.name}.` })
    }
  }
  if (puedeCambiarPrioridad(actor, current.team) && cambios.length > 0) {
    const empresa = await prisma.empresa.findUnique({ where: { id: current.empresaId } })
    const proyectoFinal = input.projectId !== undefined ? input.projectId : current.projectId
    if (empresa?.exigirProyectoAlClasificar && !proyectoFinal) {
      throw new DomainError("Esta empresa exige asociar un proyecto antes de clasificar el requerimiento.")
    }
  }
  if (cambios.length === 0 && input.moduleName === undefined) return current
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
  const almacen = await obtenerAlmacen()
  await almacen.guardar(storedName, file.bytes, file.type || "application/octet-stream")
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

async function borrarClaves(claves: string[]) {
  if (claves.length === 0) return
  const almacen = await obtenerAlmacen()
  for (const clave of claves) {
    try {
      await almacen.borrar(clave)
    } catch (error) {
      console.error("No se pudo borrar el adjunto", clave, error)
    }
  }
}

export async function eliminarRequerimiento(actor: Actor, code: string) {
  if (!puedeAdministrar(actor)) throw new PermisoDenegado()
  const current = await prisma.request.findUnique({
    where: { code },
    include: { attachments: { select: { storedName: true } } },
  })
  if (!current) throw new DomainError("El requerimiento no existe.")
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ELIMINAR",
        entity: "Request",
        entityId: current.id,
        toValue: `${current.code} · ${current.title}`,
      },
    })
    await tx.request.delete({ where: { id: current.id } })
  })
  await borrarClaves(current.attachments.map((item) => item.storedName))
}

export async function eliminarRequerimientos(actor: Actor, codes: string[]) {
  if (!puedeAdministrar(actor)) throw new PermisoDenegado()
  const unicos = [...new Set(codes.map((item) => item.trim()).filter(Boolean))]
  if (unicos.length === 0) throw new DomainError("Seleccione al menos un requerimiento.")
  for (const code of unicos) await eliminarRequerimiento(actor, code)
  return unicos.length
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
      comments: request.comments.filter((comment) => seeInternal || esEntradaPublica(comment.kind)),
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

export async function opcionesVisibles(actor: Actor) {
  const rows = await prisma.request.findMany({
    where: visibilidad(actor),
    select: {
      empresa: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, empresa: { select: { name: true } } } },
      type: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  })
  const porId = <T extends { id: string }>(items: Array<T | null | undefined>) => [...new Map(items.filter((item): item is T => Boolean(item)).map((item) => [item.id, item])).values()]
  const soloLoPropio = !esAdmin(actor) && actor.memberships.length === 0
  return {
    empresas: porId(rows.map((row) => row.empresa)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    proyectos: porId(rows.map((row) => row.project)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    tipos: porId(rows.map((row) => row.type)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    areas: porId(rows.map((row) => row.area)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    personas: porId(rows.flatMap((row) => (soloLoPropio ? [row.requester] : [row.requester, row.assignee]))).sort((a, b) => a.name.localeCompare(b.name, "es")),
  }
}

export async function opcionesTablero(actor: Actor, team: "DESARROLLO" | "MARKETING") {
  const rows = await prisma.request.findMany({
    where: { AND: [visibilidad(actor), { team }] },
    select: {
      empresa: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, empresaId: true } },
      area: { select: { id: true, name: true } },
    },
  })
  const porId = <T extends { id: string }>(items: Array<T | null | undefined>) => [...new Map(items.filter((item): item is T => Boolean(item)).map((item) => [item.id, item])).values()]
  return {
    empresas: porId(rows.map((row) => row.empresa)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    proyectos: porId(rows.map((row) => row.project)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    areas: porId(rows.map((row) => row.area)).sort((a, b) => a.name.localeCompare(b.name, "es")),
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
  empresaId?: string
  projectId?: string
  typeId?: string
  areaId?: string
  assigneeId?: string
  requesterId?: string
  mine?: boolean
  assignedToMe?: boolean
  from?: string
  to?: string
  sla?: string
  porActualizacion?: boolean
  openOnly?: boolean
  closedOnly?: boolean
  queueTeam?: TeamName | null
  onlyNew?: boolean
  sort?: string
  dir?: "asc" | "desc"
  page?: number
  pageSize?: number
  conPausas?: boolean
  conTareas?: boolean
}

export function relacionesListar(query: { conPausas?: boolean; conTareas?: boolean }) {
  return {
    pauses: query.conPausas !== false,
    tasks: query.conTareas === true,
  }
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
  if (query.empresaId) and.push({ empresaId: query.empresaId })
  if (query.projectId) and.push({ projectId: query.projectId })
  if (query.typeId) and.push({ typeId: query.typeId })
  if (query.areaId) and.push({ areaId: query.areaId })
  if (query.assigneeId) and.push({ assigneeId: query.assigneeId })
  if (query.requesterId) and.push({ requesterId: query.requesterId })
  if (query.mine) and.push({ requesterId: actor.id })
  if (query.assignedToMe) and.push({ assigneeId: actor.id })
  if (query.queueTeam) and.push({ team: query.queueTeam })
  if (query.onlyNew) and.push({ status: "NUEVO" })
  if (query.openOnly) and.push({ status: { notIn: [...TERMINAL_STATUSES] } })
  if (query.closedOnly) and.push({ status: { in: [...TERMINAL_STATUSES] } })
  if (query.from || query.to) {
    const campo = query.porActualizacion ? "updatedAt" : "createdAt"
    and.push({
      [campo]: {
        gte: query.from ? limiteFecha(query.from, false, Boolean(query.porActualizacion)) : undefined,
        lte: query.to ? limiteFecha(query.to, true, Boolean(query.porActualizacion)) : undefined,
      },
    })
  }
  const dir = query.dir === "asc" ? "asc" : "desc"
  const orderBy: Prisma.RequestOrderByWithRelationInput =
    query.sort === "requester" ? { requester: { name: dir } }
    : query.sort === "area" ? { area: { name: dir } }
    : query.sort === "type" ? { type: { name: dir } }
    : query.sort === "title" ? { title: dir }
    : ["updatedAt", "createdAt", "code", "priority", "status"].includes(query.sort || "")
      ? { [query.sort!]: dir }
      : { updatedAt: "desc" }
  const relaciones = relacionesListar(query)
  const include = {
    type: { select: { id: true, name: true, team: true } },
    requester: { select: { id: true, name: true } },
    assignee: { select: { id: true, name: true } },
    area: { select: { id: true, name: true } },
    empresa: { select: { id: true, name: true, exigirProyectoAlClasificar: true } },
    project: { select: { id: true, name: true } },
    ...(relaciones.pauses ? { pauses: { select: { startedAt: true, endedAt: true } } } : {}),
    ...(relaciones.tasks ? { tasks: { select: { id: true, title: true, status: true, parentId: true } } } : {}),
  }
  function decorar<T extends {
    slaStartedAt: Date
    resolutionMinutes: number
    slaTargetMinutes: number
    pauses?: { startedAt: Date; endedAt: Date | null }[]
    resolvedAt: Date | null
    status: string
  }>(row: T) {
    const pauses = row.pauses ?? []
    return { ...row, pauses, sla: evaluarSla({ ...row, pauses }) }
  }
  if (query.sla === "vencido" || query.sla === "riesgo") {
    const rows = await prisma.request.findMany({ where, include, orderBy, take: 400 })
    const filtradas = rows.map((row) => decorar(row)).filter((row) => (
      query.sla === "vencido" ? row.sla.state === "VENCIDO" : row.sla.state === "EN_RIESGO"
    ))
    const start = (page - 1) * pageSize
    return {
      total: filtradas.length,
      page,
      pages: Math.max(1, Math.ceil(filtradas.length / pageSize)),
      items: filtradas.slice(start, start + pageSize),
    }
  }
  const [total, rows] = await prisma.$transaction([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      include,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((row) => decorar(row)),
  }
}

export async function resumen(actor: Actor) {
  const now = new Date()
  const items = await prisma.request.findMany({
    where: { AND: [visibilidad(actor), { status: { notIn: ["CERRADO", "CANCELADO", "RECHAZADO"] } }] },
    include: {
      pauses: { select: { startedAt: true, endedAt: true } },
      type: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
      empresa: { select: { id: true, name: true } },
    },
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

export async function dashboard(actor: Actor, filters: { team?: string; brand?: string; empresaId?: string; projectId?: string; areaId?: string; from?: string; to?: string }) {
  const now = new Date()
  const from = filters.from ? new Date(filters.from) : new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)
  const to = filters.to ? new Date(filters.to) : now
  const base: Prisma.RequestWhereInput[] = [visibilidad(actor)]
  if (filters.team === "DESARROLLO" || filters.team === "MARKETING") base.push({ team: filters.team })
  if (filters.brand) base.push({ brand: filters.brand })
  if (filters.empresaId) base.push({ empresaId: filters.empresaId })
  if (filters.projectId) base.push({ projectId: filters.projectId })
  if (filters.areaId) base.push({ areaId: filters.areaId })
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
    const leaders = (await prisma.areaRole.findMany({ where: { team: request.team, role: "LIDER" }, select: { userId: true } })).map((item) => item.userId)
    if (sla.state === "VENCIDO" || sla.state === "EN_RIESGO") {
      const clave = sla.state === "VENCIDO" ? "VENCIDO" : "RIESGO"
      const messages: EmailMessage[] = []
      await prisma.$transaction(async (tx) => {
        await fanout(tx, [request.assigneeId, ...leaders], {
          requestId: request.id,
          subject: `${request.code} · ${clave === "VENCIDO" ? "SLA de solución vencido" : "SLA de solución por vencer"}`,
          body: clave === "VENCIDO"
            ? `${request.code} venció el SLA de solución.\n${link(request.code)}`
            : `${request.code} ya consumió al menos el 75 % del SLA de solución.\n${link(request.code)}`,
          dedupeKey: `sla-${clave}-${request.id}`,
        }, messages)
      })
      await deliver(email, messages)
      sent += messages.length
    }
    if (sla.state !== "EN_PAUSA" && sla.state !== "NO_APLICA" && sla.state !== "VENCIDO" && sla.remainingMinutes > 0 && sla.remainingMinutes <= 30) {
      const aviso: EmailMessage[] = []
      await prisma.$transaction(async (tx) => {
        await fanout(tx, [request.assigneeId, ...leaders], {
          requestId: request.id,
          subject: `${request.code} · A 30 min de vencer`,
          body: `${request.code} está a 30 minutos o menos de vencer el SLA de solución.\n${link(request.code)}`,
          dedupeKey: `sla-30-${request.id}`,
        }, aviso)
      })
      await deliver(email, aviso)
      sent += aviso.length
    }
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

export async function marcarAvisoLeido(actor: Actor, id: string) {
  await prisma.notification.updateMany({ where: { id, userId: actor.id, readAt: null }, data: { readAt: new Date() } })
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
    prisma.user.findMany({ include: { area: true, areaRoles: true, empresas: true, areasExtra: true }, orderBy: { name: "asc" } }),
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

export async function cambiarPrioridadMasiva(actor: Actor, codes: string[], priority: string) {
  if (!["BAJA", "MEDIA", "ALTA", "CRITICA"].includes(priority)) throw new DomainError("Elija una prioridad.")
  if (!esAdmin(actor) && !actor.memberships.some((item) => item.role === "LIDER")) {
    throw new DomainError("Solo un líder o el administrador cambia la prioridad de varios requerimientos.")
  }
  let cambiados = 0
  for (const code of codes) {
    const request = await prisma.request.findUnique({ where: { code } })
    if (!request || !puedeVer(actor, request)) continue
    if (!esAdmin(actor) && !puedeCambiarPrioridad(actor, request.team)) continue
    await prisma.request.update({ where: { id: request.id }, data: { priority } })
    cambiados += 1
  }
  return cambiados
}

export async function eliminarEstado(actor: Actor, id: string, moveToKey?: string) {
  void moveToKey
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador configura flujos.")
  const state = await prisma.workflowState.findUnique({ where: { id } })
  if (!state) throw new DomainError("El estado no existe.")
  const usados = await prisma.request.count({ where: { team: state.team, status: state.key } })
  if (usados > 0) {
    throw new DomainError(`El estado «${state.name}» tiene ${usados} requerimientos. Muévalos a otro estado antes de eliminarlo.`)
  }
  try {
    await prisma.workflowState.delete({ where: { id } })
  } catch {
    throw new DomainError(`No se puede eliminar «${state.name}» porque el flujo todavía lo usa. Quite primero las transiciones que entran o salen de ese estado.`)
  }
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

export async function transicionarMasiva(actor: Actor, codes: string[], name: string) {
  if (!name.trim()) throw new DomainError("Elija un estado.")
  let cambiados = 0
  for (const code of codes) {
    const request = await prisma.request.findUnique({ where: { code } })
    if (!request || !puedeVer(actor, request)) continue
    const catalogo = await catalogoDe(request.team)
    const now = new Date()
    const disponibles = transicionesPara(actor, acceso(request), catalogo, now)
    const transicion = disponibles.find((item) => item.name === name || item.to === name)
    if (!transicion) continue
    try {
      await transicionar(actor, request.id, transicion.name, "")
      cambiados += 1
    } catch {
      // Se conservan permisos y validaciones de cada transición; las que no aplican se omiten.
    }
  }
  return cambiados
}

export async function asignarMasiva(actor: Actor, codes: string[], assigneeId: string) {
  if (!assigneeId) throw new DomainError("Elija un responsable.")
  const errores: { code: string; mensaje: string }[] = []
  let hechos = 0
  for (const code of codes) {
    const request = await prisma.request.findUnique({ where: { code }, select: { id: true } })
    if (!request) {
      errores.push({ code, mensaje: "El requerimiento no existe." })
      continue
    }
    try {
      await asignar(actor, request.id, assigneeId)
      hechos += 1
    } catch (error) {
      errores.push({ code, mensaje: error instanceof Error ? error.message : "No se pudo asignar." })
    }
  }
  return { hechos, errores }
}
