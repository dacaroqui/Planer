import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { MemoryEmailProvider } from "@/lib/email"
import { DomainError, type Membership } from "@/lib/domain"
import { ZONE } from "@/lib/time"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import { comentar, getDetalle, radicar, registrarEntrada, transicionar } from "@/server/requests"
import { esPorResponder } from "@/lib/cronologia"
import { listarBandeja, puedeEntrarBandeja } from "@/server/bandeja"

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
  await prisma.empresa.updateMany({ data: { exigirProyectoAlClasificar: false } })
  await prisma.area.deleteMany()
}

beforeEach(async () => {
  await reset()
  await asegurarCatalogo()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function escena() {
  const area = await prisma.area.create({ data: { name: "Académico" } })
  const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Error (bug)" } })
  async function persona(name: string, email: string, memberships: Membership[] = []) {
    const user = await prisma.user.create({
      data: { name, email, role: "SOLICITANTE", areaId: area.id, areaRoles: { create: memberships } },
      include: { areaRoles: true },
    })
    return toActor(user)
  }
  const ana = await persona("Ana Ejemplo", "ana.ejemplo@cifes.edu.co")
  const valentina = await persona("Valentina Ejemplo", "valentina.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "AGENTE" }])
  const helena = await persona("Helena Ejemplo", "helena.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "LIDER" }])
  const gerencia = await persona("Gerencia Ejemplo", "gerencia.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "OBSERVADOR" }])
  const now = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
  const email = new MemoryEmailProvider()
  const request = await radicar(ana, {
    title: "El aula de prueba no abre",
    description: "La cohorte demo no carga el módulo de colorimetría.",
    team: "DESARROLLO",
    typeId: tipo.id,
    priority: "MEDIA",
    brand: "CIFES",
    stepsToReproduce: "Entrar al aula demo y abrir colorimetría.",
    declares: true,
  }, { email, now })
  return { ana, valentina, helena, gerencia, request, email, now }
}

describe("bandeja y cronología", () => {
  it("el agente responde en público, el observador no escribe y el solicitante no entra a la bandeja", async () => {
    const { ana, valentina, gerencia, request, email, now } = await escena()
    expect(puedeEntrarBandeja(ana)).toBe(false)
    expect(puedeEntrarBandeja(valentina)).toBe(true)
    await registrarEntrada(valentina, request.id, { kind: "PUBLICA", body: "Ya lo estoy revisando en el ambiente demo." }, { email, now })
    const publico = await prisma.comment.findFirstOrThrow({ where: { requestId: request.id } })
    expect(publico.kind).toBe("PUBLICA")
    expect(publico.internal).toBe(false)
    const fresco = await prisma.request.findUniqueOrThrow({ where: { id: request.id } })
    expect(fresco.lastPublicActorId).toBe(valentina.id)
    expect(esPorResponder(fresco)).toBe(false)
    await expect(registrarEntrada(gerencia, request.id, { kind: "INTERNA", body: "No debería poder." }, { email, now })).rejects.toBeInstanceOf(DomainError)
    const detalleAna = await getDetalle(ana, request.code)
    expect(detalleAna?.request.comments.map((item) => item.body)).toContain("Ya lo estoy revisando en el ambiente demo.")
  })

  it("la nota interna no la ve el solicitante y el registro suma horas a la tarea", async () => {
    const { ana, valentina, request, email, now } = await escena()
    const tarea = await prisma.tarea.create({
      data: { title: "Reproducir el fallo", status: "EN_CURSO", requestId: request.id, createdById: valentina.id, assigneeId: valentina.id },
    })
    await registrarEntrada(valentina, request.id, { kind: "INTERNA", body: "Nota solo del equipo." }, { email, now })
    await registrarEntrada(valentina, request.id, { kind: "REGISTRO", body: "Reproduje el fallo con la cohorte demo.", minutes: 90, tareaId: tarea.id, compartir: true }, { email, now })
    const guardada = await prisma.tarea.findUniqueOrThrow({ where: { id: tarea.id } })
    expect(Number(guardada.horasReales)).toBe(1.5)
    const anaVe = await getDetalle(ana, request.code)
    expect(anaVe?.request.comments.some((item) => item.kind === "INTERNA" || item.kind === "REGISTRO")).toBe(false)
    const equipoVe = await getDetalle(valentina, request.code)
    expect(equipoVe?.request.comments.some((item) => item.kind === "REGISTRO")).toBe(true)
  })

  it("entregar y cerrar aceptan la nota vacía y la muestran solo si existe", async () => {
    const { ana, valentina, helena, request, email, now } = await escena()
    await prisma.request.update({ where: { id: request.id }, data: { assigneeId: valentina.id, status: "EN_PRUEBAS" } })
    await transicionar(helena, request.id, "Entregar para validación", "", { deliveryUrl: "https://demo.cifes.test/aula", resolutionNote: "" }, { email, now })
    let detalle = await getDetalle(ana, request.code)
    expect(detalle?.request.status).toBe("EN_VALIDACION")
    expect(detalle?.request.resolutionNote).toBeNull()
    await prisma.request.update({ where: { id: request.id }, data: { status: "EN_PRUEBAS" } })
    await transicionar(helena, request.id, "Entregar para validación", "Quedó el parche en el ambiente demo.", { deliveryUrl: "https://demo.cifes.test/aula", resolutionNote: "Quedó el parche en el ambiente demo." }, { email, now })
    detalle = await getDetalle(ana, request.code)
    expect(detalle?.request.resolutionNote).toBe("Quedó el parche en el ambiente demo.")
    expect(detalle?.request.comments.some((item) => item.kind === "PUBLICA")).toBe(true)
  })

  it("pedir información pausa el SLA y la respuesta del solicitante queda por responder", async () => {
    const { ana, valentina, request, email, now } = await escena()
    await prisma.request.update({ where: { id: request.id }, data: { assigneeId: valentina.id, status: "EN_ANALISIS" } })
    await registrarEntrada(valentina, request.id, { kind: "SOLICITUD_INFO", body: "¿Cuál cohorte de prueba debo usar?" }, { email, now })
    const pausado = await getDetalle(ana, request.code)
    expect(pausado?.request.status).toBe("EN_ESPERA")
    expect(pausado?.sla.state).toBe("EN_PAUSA")
    await comentar(ana, request.id, "Use la cohorte demo 2026-1.", false, { email, now })
    const fresco = await prisma.request.findUniqueOrThrow({ where: { id: request.id } })
    expect(esPorResponder(fresco)).toBe(true)
    const bandeja = await listarBandeja(valentina, { tab: "responder" })
    expect(bandeja.filas.map((item) => item.code)).toContain(request.code)
    const aviso = await prisma.notification.findFirst({ where: { userId: valentina.id, subject: { contains: "El solicitante respondió" } } })
    expect(aviso).not.toBeNull()
  })

  it("cuenta las pestañas en una consulta agrupada y lista solo los campos de la fila", async () => {
    const { valentina, request, email, now } = await escena()
    await prisma.request.update({
      where: { id: request.id },
      data: {
        assigneeId: null,
        slaStartedAt: new Date("2020-01-06T13:00:00.000Z"),
        slaTargetMinutes: 30,
        resolutionMinutes: 30,
      },
    })
    const vencidas = await listarBandeja(valentina, { tab: "vencer" })
    expect(vencidas.conteos).toEqual({ responder: 1, "sin-asignar": 1, mios: 0, espera: 0, vencer: 1 })
    expect(vencidas.filas).toEqual([expect.objectContaining({
      code: request.code,
      title: "El aula de prueba no abre",
      requester: "Ana Ejemplo",
      assignee: "Sin asignar",
      sla: "VENCIDO",
    })])
    await prisma.request.update({ where: { id: request.id }, data: { assigneeId: valentina.id } })
    const mias = await listarBandeja(valentina, { tab: "mios" })
    expect(mias.conteos.mios).toBe(1)
    expect(mias.conteos["sin-asignar"]).toBe(0)
    expect(mias.filas).toHaveLength(1)
    await registrarEntrada(valentina, request.id, { kind: "PUBLICA", body: "Listo el arreglo en el ambiente demo." }, { email, now })
    const respondidas = await listarBandeja(valentina, { tab: "responder" })
    expect(respondidas.conteos.responder).toBe(0)
    expect(respondidas.filas).toEqual([])
    expect(respondidas.conteos.vencer).toBe(1)
    await prisma.request.update({
      where: { id: request.id },
      data: { status: "EN_ESPERA", slaStartedAt: now, slaTargetMinutes: 1440, resolutionMinutes: 1440 },
    })
    await prisma.slaPause.create({ data: { requestId: request.id, startedAt: now, reason: "EN_ESPERA" } })
    const espera = await listarBandeja(valentina, { tab: "espera" })
    expect(espera.conteos.espera).toBe(1)
    expect(espera.conteos.vencer).toBe(0)
    expect(espera.filas.map((fila) => fila.code)).toEqual([request.code])
  })

  it("quien es el solicitante no se responde ni queda pendiente por su propio mensaje", async () => {
    const { ana, valentina, request, email, now } = await escena()
    const admin = toActor(await prisma.user.create({
      data: { name: "Admin Ejemplo", email: "admin.ejemplo@cifes.edu.co", role: "ADMINISTRADOR", areaId: ana.areaId },
      include: { areaRoles: true },
    }))
    await prisma.request.update({ where: { id: request.id }, data: { requesterId: admin.id, assigneeId: admin.id } })
    await expect(registrarEntrada(admin, request.id, { kind: "PUBLICA", body: "Me respondo en público." }, { email, now })).rejects.toThrow(/sí mismo/)
    await expect(registrarEntrada(admin, request.id, { kind: "SOLICITUD_INFO", body: "Me pido datos." }, { email, now })).rejects.toThrow(/sí mismo/)
    await registrarEntrada(admin, request.id, { kind: "INTERNA", body: "Nota para el equipo, no para mí." }, { email, now })
    expect(await prisma.notification.count({ where: { userId: admin.id } })).toBe(0)
    await prisma.request.update({ where: { id: request.id }, data: { lastPublicActorId: admin.id, lastPublicAt: now } })
    const propia = await listarBandeja(admin, { tab: "responder" })
    expect(propia.filas.map((fila) => fila.code)).not.toContain(request.code)
    expect(propia.conteos.responder).toBe(0)
    const delEquipo = await listarBandeja(valentina, { tab: "responder" })
    expect(delEquipo.filas.map((fila) => fila.code)).toContain(request.code)
    expect(delEquipo.conteos.responder).toBe(1)
  })
})
