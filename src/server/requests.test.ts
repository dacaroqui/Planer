import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { MemoryEmailProvider } from "@/lib/email"
import { DomainError, type Actor, type Membership } from "@/lib/domain"
import { ZONE } from "@/lib/time"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import {
  adjuntar,
  asignar,
  comentar,
  editarCampos,
  getDetalle,
  radicar,
  transicionar,
} from "@/server/requests"

let dir = ""

async function reset() {
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.slaPause.deleteMany()
  await prisma.tarea.deleteMany()
  await prisma.request.deleteMany()
  await prisma.proyecto.deleteMany()
  await prisma.codeSequence.deleteMany()
  await prisma.invitacion.deleteMany()
  await prisma.restablecimiento.deleteMany()
  await prisma.usuarioEmpresa.deleteMany()
  await prisma.usuarioArea.deleteMany()
  await prisma.areaRole.deleteMany()
  await prisma.user.deleteMany()
  await prisma.slaPolicy.deleteMany()
  await prisma.requestType.deleteMany()
  await prisma.workflowTransition.deleteMany()
  await prisma.workflowState.deleteMany()
  await prisma.catalogItem.deleteMany()
  await prisma.area.deleteMany()
}

beforeEach(async () => {
  await reset()
  await asegurarCatalogo()
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
  const incidencia = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Error (bug)" } })
  const pieza = await prisma.requestType.findFirstOrThrow({ where: { team: "MARKETING", name: "Pieza gráfica" } })
  async function persona(name: string, email: string, areaId: string, memberships: Membership[] = [], admin = false) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
        areaId,
        areaRoles: { create: memberships.map((item) => ({ team: item.team, role: item.role })) },
      },
      include: { areaRoles: true },
    })
    return toActor(user)
  }
  const ana = await persona("Ana Ejemplo", "ana.ejemplo@cifes.edu.co", area.id)
  const julian = await persona("Julián Ejemplo", "julian.ejemplo@cifes.edu.co", clinica.id)
  const valentina = await persona("Valentina Ejemplo", "valentina.ejemplo@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
  const camila = await persona("Camila Ejemplo", "camila.ejemplo@cifes.edu.co", area.id, [{ team: "MARKETING", role: "AGENTE" }])
  const helena = await persona("Helena Ejemplo", "helena.ejemplo@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "LIDER" }])
  const sara = await persona("Sara Ejemplo", "sara.ejemplo@cifes.edu.co", area.id, [{ team: "MARKETING", role: "LIDER" }])
  const gerencia = await persona("Gerencia Ejemplo", "gerencia.ejemplo@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "OBSERVADOR" }])
  return { incidencia, pieza, ana, julian, valentina, camila, helena, sara, gerencia }
}

const base = {
  justification: "Evita que la cohorte pierda la clase de la semana.",
  declares: true,
  reviewedPersonalData: true,
}

describe("RQ-01 RQ-04 radicar con código de área", () => {
  it("crea DES-0001 en estado Nuevo y avisa al líder", async () => {
    const { incidencia, ana, helena } = await mundo()
    const email = new MemoryEmailProvider()
    const first = await radicar(ana, {
      ...base,
      title: "El aula no abre colorimetría",
      description: "Desde el lunes el módulo de colorimetría muestra una página en blanco al ingresar.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "ALTA",
      brand: "CIFES",
      stepsToReproduce: "Entrar al aula de prueba con el usuario demo y abrir el módulo.",
    }, { email })
    const second = await radicar(ana, {
      ...base,
      title: "Otro error del listado",
      description: "El botón de exportar asistencia no genera el archivo para la cohorte de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir asistencia de la cohorte demo y presionar exportar.",
    }, { email })
    expect(first.code).toBe("DES-0001")
    expect(second.code).toBe("DES-0002")
    expect(first.status).toBe("NUEVO")
    expect(email.messages.some((message) => message.to === helena.email && message.subject.includes("DES-0001"))).toBe(true)
    expect(email.messages.every((message) => !message.text.includes("adjunto binario"))).toBe(true)
  })

  it("rechaza el envío sin la declaración de datos personales", async () => {
    const { incidencia, ana } = await mundo()
    await expect(radicar(ana, {
      ...base,
      declares: false,
      title: "Error de prueba del aula",
      description: "El módulo de colorimetría no carga para la cohorte de demostración.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el módulo con el usuario de prueba.",
    })).rejects.toBeInstanceOf(DomainError)
  })
})

describe("RQ-10 RQ-11 RQ-12 RQ-21 transición, devolución y visibilidad", () => {
  it("respeta el rol, exige datos al aprobar y oculta el caso a otra área", async () => {
    const { incidencia, ana, valentina, camila, helena, gerencia } = await mundo()
    const email = new MemoryEmailProvider()
    const now = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
    const request = await radicar(ana, {
      ...base,
      title: "Reporte de asistencia por cohorte",
      description: "Coordinación necesita bajar la asistencia por cohorte y por módulo de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Entrar a asistencia demo y elegir la cohorte de prueba.",
    }, { email, now })

    expect(await getDetalle(camila, request.code)).toBeNull()
    await expect(transicionar(valentina, request.id, "Iniciar análisis", null, {}, { email, now })).rejects.toBeInstanceOf(DomainError)
    await transicionar(helena, request.id, "Iniciar análisis", null, {}, { email, now })
    await expect(transicionar(helena, request.id, "Aprobar", null, {}, { email, now })).rejects.toBeInstanceOf(DomainError)
    await asignar(helena, request.id, valentina.id, { email, now })
    await editarCampos(helena, request.id, { committedDate: "2026-11-20", priority: "ALTA" }, { email, now })
    const cambio = await prisma.activity.findFirst({ where: { requestId: request.id, field: "prioridad" } })
    expect(cambio?.fromValue).toBe("MEDIA")
    expect(cambio?.toValue).toBe("ALTA")
    await transicionar(helena, request.id, "Aprobar", null, {}, { email, now })
    await transicionar(valentina, request.id, "Iniciar desarrollo", null, {}, { email, now })
    await transicionar(valentina, request.id, "Pedir información", "¿Cuál cohorte de prueba debo usar?", {}, { email, now })
    let detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("EN_ESPERA")
    expect(detail?.sla.state).toBe("EN_PAUSA")
    await comentar(ana, request.id, "Use la cohorte demo 2026-1.", false, { email, now })
    detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("EN_DESARROLLO")
    await comentar(valentina, request.id, "Nota **interna** del índice.", true, { email, now })
    expect((await getDetalle(ana, request.code))?.request.comments.some((item) => item.internal)).toBe(false)
    expect((await getDetalle(gerencia, request.code))?.request.comments.some((item) => item.internal)).toBe(false)
    expect((await getDetalle(helena, request.code))?.request.comments.some((item) => item.internal)).toBe(true)
  })
})

describe("RQ-03 RQ-13 adjunto y aprobación de la entrega", () => {
  it("adjunta, entrega con enlace y el solicitante aprueba", async () => {
    const { incidencia, ana, valentina, helena } = await mundo()
    const email = new MemoryEmailProvider()
    const now = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
    const request = await radicar(ana, {
      ...base,
      title: "Falla al exportar la cohorte",
      description: "El exportar de asistencia demo no genera el archivo de la cohorte de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "ALTA",
      brand: "CIFES",
      stepsToReproduce: "Abrir asistencia demo y presionar exportar.",
    }, { email, now })
    await adjuntar(ana, request.id, { name: "captura.png", type: "image/png", bytes: Buffer.from("png") })
    await expect(adjuntar(ana, request.id, { name: "virus.exe", type: "application/octet-stream", bytes: Buffer.from("x") })).rejects.toBeInstanceOf(DomainError)
    await transicionar(helena, request.id, "Iniciar análisis", null, {}, { email, now })
    await asignar(helena, request.id, valentina.id, { email, now })
    await editarCampos(helena, request.id, { committedDate: "2026-11-18" }, { email, now })
    await transicionar(helena, request.id, "Aprobar", null, {}, { email, now })
    await transicionar(valentina, request.id, "Iniciar desarrollo", null, {}, { email, now })
    await transicionar(valentina, request.id, "Enviar a pruebas", "Quedó el ajuste en el ambiente de pruebas.", {}, { email, now })
    await transicionar(helena, request.id, "Entregar para validación", "Listo para revisar.", {
      deliveryUrl: "https://ejemplo.cifes.edu.co/pruebas",
    }, { email, now })
    await transicionar(ana, request.id, "Devolver", "Falta el total por módulo.", {}, { email, now })
    let detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("EN_DESARROLLO")
    await transicionar(valentina, request.id, "Enviar a pruebas", "Corregido el total.", {}, { email, now })
    await transicionar(helena, request.id, "Entregar para validación", "Segunda entrega.", {
      deliveryUrl: "https://ejemplo.cifes.edu.co/pruebas",
    }, { email, now })
    await transicionar(ana, request.id, "Aprobar entrega", null, {}, { email, now })
    detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("CERRADO")
    expect(detail?.request.resolution).toBe("RESUELTO")
  })
})

void (0 as unknown as Actor)
