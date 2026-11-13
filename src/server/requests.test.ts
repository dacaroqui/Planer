import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { MemoryEmailProvider } from "@/lib/email"
import { DomainError, type Actor } from "@/lib/domain"
import { ZONE } from "@/lib/time"
import {
  adjuntar,
  asignar,
  comentar,
  getDetalle,
  radicar,
  transicionar,
} from "@/server/requests"

let dir = ""

async function reset() {
  await prisma.notification.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.slaPause.deleteMany()
  await prisma.request.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.user.deleteMany()
  await prisma.requestType.deleteMany()
  await prisma.area.deleteMany()
}

beforeEach(async () => {
  await reset()
  if (!dir) {
    dir = await mkdtemp(path.join(os.tmpdir(), "mesa-uploads-"))
    process.env.UPLOAD_DIR = dir
  }
})

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  await prisma.$disconnect()
})

async function mundo() {
  const area = await prisma.area.create({ data: { name: "Académico" } })
  const clinica = await prisma.area.create({ data: { name: "Clínica Luvania" } })
  const incidencia = await prisma.requestType.create({
    data: {
      team: "DESARROLLO",
      name: "Incidencia",
      description: "Algo dejó de funcionar.",
      slaMinutes: 8 * 60,
      requiresApproval: false,
    },
  })
  const funcionalidad = await prisma.requestType.create({
    data: {
      team: "DESARROLLO",
      name: "Nueva funcionalidad",
      description: "Capacidad nueva de la plataforma.",
      slaMinutes: 40 * 60,
      requiresApproval: true,
    },
  })
  const pieza = await prisma.requestType.create({
    data: {
      team: "MARKETING",
      name: "Pieza gráfica",
      description: "Una pieza para una campaña.",
      slaMinutes: 16 * 60,
      requiresApproval: false,
    },
  })
  const users = {
    ana: await prisma.user.create({
      data: { name: "Ana Ejemplo", email: "ana.ejemplo@cifes.edu.co", role: "SOLICITANTE", areaId: area.id },
    }),
    julian: await prisma.user.create({
      data: { name: "Julián Ejemplo", email: "julian.ejemplo@cifes.edu.co", role: "SOLICITANTE", areaId: clinica.id },
    }),
    valentina: await prisma.user.create({
      data: { name: "Valentina Ejemplo", email: "valentina.ejemplo@cifes.edu.co", role: "AGENTE", team: "DESARROLLO", areaId: area.id },
    }),
    camila: await prisma.user.create({
      data: { name: "Camila Ejemplo", email: "camila.ejemplo@cifes.edu.co", role: "AGENTE", team: "MARKETING", areaId: area.id },
    }),
    helena: await prisma.user.create({
      data: { name: "Helena Ejemplo", email: "helena.ejemplo@cifes.edu.co", role: "LIDER", team: "DESARROLLO", areaId: area.id },
    }),
    sara: await prisma.user.create({
      data: { name: "Sara Ejemplo", email: "sara.ejemplo@cifes.edu.co", role: "LIDER", team: "MARKETING", areaId: area.id },
    }),
    gerencia: await prisma.user.create({
      data: { name: "Gerencia Ejemplo", email: "gerencia.ejemplo@cifes.edu.co", role: "OBSERVADOR", areaId: area.id },
    }),
  }
  const as = (user: typeof users.ana): Actor => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    areaId: user.areaId,
    active: user.active,
  })
  return { area, incidencia, funcionalidad, pieza, users, as }
}

describe("RQ-08 RQ-09 radicar y consecutivo", () => {
  it("crea el requerimiento, avisa al líder y numera en orden", async () => {
    const { incidencia, users, as } = await mundo()
    const email = new MemoryEmailProvider()
    const first = await radicar(as(users.ana), {
      title: "El aula virtual no abre colorimetría",
      description: "Desde ayer el módulo de colorimetría muestra una página en blanco al ingresar.",
      expectedResult: "Que el módulo vuelva a cargar para los estudiantes activos.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "ALTA",
      brand: "CIFES",
    }, { email })
    const second = await radicar(as(users.ana), {
      title: "No descarga el listado de la cohorte",
      description: "El botón de exportar en asistencia no genera el archivo para la cohorte 2026-1.",
      expectedResult: "Descargar el listado en CSV.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
    }, { email })
    expect(first.code).toMatch(/^REQ-\d{4}-0001$/)
    expect(second.code).toMatch(/^REQ-\d{4}-0002$/)
    expect(first.status).toBe("RADICADO")
    expect(email.messages.some((message) => message.to === users.helena.email && message.subject.includes(first.code))).toBe(true)
    const detail = await getDetalle(as(users.ana), first.code)
    expect(detail?.request.activities[0]?.message).toMatch(/Radicó/)
    expect(detail?.sla.state).toBe("A_TIEMPO")
  })
})

describe("RQ-15 RQ-16 RQ-19 RQ-21 comentario, transición, aprobar y devolver", () => {
  it("respeta el rol en el flujo de aprobación y oculta la nota interna", async () => {
    const { funcionalidad, users, as } = await mundo()
    const email = new MemoryEmailProvider()
    const now = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
    const request = await radicar(as(users.ana), {
      title: "Reporte de asistencia por cohorte",
      description: "Necesitamos un reporte descargable de asistencia por cohorte y por módulo.",
      expectedResult: "Un CSV con estudiante, módulo y porcentaje de asistencia.",
      team: "DESARROLLO",
      typeId: funcionalidad.id,
      priority: "MEDIA",
      brand: "CIFES",
    }, { email, now })

    await expect(transicionar(as(users.ana), request.id, "EN_DESARROLLO", null)).rejects.toBeInstanceOf(DomainError)
    await expect(transicionar(as(users.camila), request.id, "EN_ANALISIS", null)).rejects.toBeInstanceOf(DomainError)

    await transicionar(as(users.valentina), request.id, "EN_ANALISIS", null, { email, now })
    await transicionar(as(users.valentina), request.id, "PENDIENTE_APROBACION", null, { email, now })
    await expect(transicionar(as(users.valentina), request.id, "APROBADO", null)).rejects.toBeInstanceOf(DomainError)
    await expect(transicionar(as(users.sara), request.id, "APROBADO", null)).rejects.toBeInstanceOf(DomainError)
    await expect(transicionar(as(users.helena), request.id, "DEVUELTO", " ")).rejects.toBeInstanceOf(DomainError)

    await transicionar(as(users.helena), request.id, "DEVUELTO", "Falta el criterio de la cohorte cerrada.", { email, now })
    let detail = await getDetalle(as(users.ana), request.code)
    expect(detail?.request.status).toBe("DEVUELTO")
    expect(detail?.request.comments.some((comment) => comment.body.includes("cohorte cerrada"))).toBe(true)

    await transicionar(as(users.valentina), request.id, "EN_ANALISIS", null, { email, now })
    await transicionar(as(users.valentina), request.id, "PENDIENTE_APROBACION", null, { email, now })
    await transicionar(as(users.helena), request.id, "APROBADO", "El alcance queda en CSV, sin PDF.", { email, now })
    await transicionar(as(users.valentina), request.id, "EN_DESARROLLO", null, { email, now })

    await comentar(as(users.ana), request.id, "Quedó claro el alcance, gracias.", false, { email, now })
    await comentar(as(users.valentina), request.id, "Hay que revisar el índice de matrícula antes de consultar.", true, { email, now })
    await expect(comentar(as(users.gerencia), request.id, "Una nota", false)).rejects.toBeInstanceOf(DomainError)

    detail = await getDetalle(as(users.ana), request.code)
    expect(detail?.request.status).toBe("EN_DESARROLLO")
    expect(detail?.request.comments.some((comment) => comment.internal)).toBe(false)
    expect(detail?.seeInternal).toBe(false)
    const gerencia = await getDetalle(as(users.gerencia), request.code)
    expect(gerencia?.request.comments.some((comment) => comment.internal)).toBe(true)
    expect(gerencia?.transitions).toHaveLength(0)

    await asignar(as(users.helena), request.id, users.valentina.id, { email, now })
    detail = await getDetalle(as(users.valentina), request.code)
    expect(detail?.request.assigneeId).toBe(users.valentina.id)
  })
})

describe("RQ-10 RQ-18 RQ-23 adjunto, marketing y pausa del SLA", () => {
  it("adjunta un archivo y pausa el reloj al pedir el brief", async () => {
    const { pieza, users, as } = await mundo()
    const email = new MemoryEmailProvider()
    const start = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
    const request = await radicar(as(users.julian), {
      title: "Pieza para el tratamiento de labios",
      description: "Necesitamos una pieza cuadrada para contar el protocolo de labios de la clínica.",
      expectedResult: "Una imagen lista para publicar en redes, con el logo de Luvania.",
      team: "MARKETING",
      typeId: pieza.id,
      priority: "ALTA",
      brand: "LUVANIA",
    }, { email, now: start })

    await adjuntar(as(users.julian), request.id, {
      name: "referencia.png",
      type: "image/png",
      bytes: Buffer.from("png-falso"),
    })
    const saved = await prisma.attachment.findFirst({ where: { requestId: request.id } })
    expect(saved?.filename).toBe("referencia.png")

    await transicionar(as(users.camila), request.id, "EN_REVISION", null, { email, now: start })
    const pausedAt = DateTime.fromISO("2026-11-09T11:00:00", { zone: ZONE }).toJSDate()
    await transicionar(as(users.camila), request.id, "PENDIENTE_BRIEF", "Necesitamos el texto legal del tratamiento.", {
      email,
      now: pausedAt,
    })
    const detail = await getDetalle(as(users.julian), request.code)
    expect(detail?.request.status).toBe("PENDIENTE_BRIEF")
    expect(detail?.request.pauses.some((pause) => pause.endedAt === null)).toBe(true)
    expect(detail?.sla.state).toBe("EN_PAUSA")

    await transicionar(as(users.julian), request.id, "EN_REVISION", "El texto aprobado va en el brief adjunto.", {
      email,
      now: DateTime.fromISO("2026-11-09T15:00:00", { zone: ZONE }).toJSDate(),
    })
    const resumed = await prisma.slaPause.findFirst({ where: { requestId: request.id } })
    expect(resumed?.endedAt).not.toBeNull()
  })
})
