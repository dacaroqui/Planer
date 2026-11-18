import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { MemoryEmailProvider } from "@/lib/email"
import { PermisoDenegado, type Membership } from "@/lib/domain"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import { asignar, guardarRoles, radicar } from "@/server/requests"
import { desactivarPersona } from "@/server/personas-baja"
import { guardarTarea } from "@/server/proyectos"

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
  await prisma.area.deleteMany()
}

beforeEach(async () => {
  await reset()
  await asegurarCatalogo()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function persona(name: string, email: string, areaId: string, memberships: Membership[] = [], admin = false) {
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
      areaId,
      areaRoles: { create: memberships },
    },
    include: { areaRoles: true },
  })
  return toActor(user)
}

const base = {
  justification: "Evita que la cohorte pierda la clase de la semana.",
  declares: true,
  reviewedPersonalData: true,
}

describe("avisos de asignación", () => {
  it("avisa a líderes y administradores al entrar un caso, y al antiguo y al nuevo al reasignar", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const ana = await persona("Ana Ejemplo", "ana.avisos@cifes.edu.co", area.id)
    const helena = await persona("Helena Ejemplo", "helena.avisos@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "LIDER" }])
    const valentina = await persona("Valentina Ejemplo", "valentina.avisos@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
    const mateo = await persona("Mateo Ejemplo", "mateo.avisos@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
    const admin = await persona("Admin Ejemplo", "admin.avisos@cifes.edu.co", area.id, [], true)
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Error (bug)" } })
    const email = new MemoryEmailProvider()
    const request = await radicar(ana, {
      ...base,
      title: "El aula no abre colorimetría",
      description: "Desde el lunes el módulo de colorimetría muestra una página en blanco al ingresar.",
      team: "DESARROLLO",
      typeId: tipo.id,
      priority: "ALTA",
      brand: "CIFES",
      stepsToReproduce: "Entrar al aula de prueba con el usuario demo y abrir el módulo.",
    }, { email })
    const alEntrar = await prisma.notification.findMany({ where: { requestId: request.id } })
    expect(alEntrar.map((item) => item.userId).sort()).toEqual([admin.id, helena.id].sort())
    expect(alEntrar.every((item) => item.userId !== ana.id)).toBe(true)
    await asignar(helena, request.id, valentina.id, { email })
    expect(await prisma.notification.findFirst({ where: { userId: valentina.id, subject: { contains: "se te asignó" } } })).toBeTruthy()
    expect(await prisma.notification.findFirst({ where: { userId: ana.id, subject: { contains: "ya tiene responsable" } } })).toBeTruthy()
    expect(await prisma.notification.count({ where: { userId: helena.id, subject: { contains: "se te asignó" } } })).toBe(0)
    await asignar(helena, request.id, mateo.id, { email })
    expect(await prisma.notification.findFirst({ where: { userId: valentina.id, subject: { contains: "reasignó" } } })).toBeTruthy()
    expect(await prisma.notification.findFirst({ where: { userId: mateo.id, subject: { contains: "se te asignó" } } })).toBeTruthy()
    expect(email.messages.some((message) => message.to === valentina.email)).toBe(true)
  })

  it("avisa la tarea al nuevo y al anterior, y no al autor", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const helena = await persona("Helena Tarea", "helena.tarea@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "LIDER" }])
    const valentina = await persona("Valentina Tarea", "valentina.tarea@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
    const mateo = await persona("Mateo Tarea", "mateo.tarea@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Error (bug)" } })
    const empresa = await prisma.empresa.findFirstOrThrow({ where: { name: "CIFES" } })
    const request = await prisma.request.create({
      data: {
        code: "DES-0099",
        title: "Caso con tarea",
        description: "Descripción de la tarea de prueba del aula.",
        brand: "CIFES",
        empresaId: empresa.id,
        priority: "MEDIA",
        prioritySuggested: "MEDIA",
        team: "DESARROLLO",
        status: "NUEVO",
        typeId: tipo.id,
        areaId: area.id,
        requesterId: helena.id,
        slaStartedAt: new Date(),
        slaTargetMinutes: 60,
      },
    })
    const tarea = await guardarTarea(helena, { title: "Revisar el aula", status: "PENDIENTE", requestId: request.id, assigneeId: valentina.id })
    expect(await prisma.notification.findFirst({ where: { userId: valentina.id, subject: { contains: "se te asignó" } } })).toBeTruthy()
    expect(await prisma.notification.count({ where: { userId: helena.id } })).toBe(0)
    await guardarTarea(helena, { id: tarea.id, title: "Revisar el aula", status: "PENDIENTE", requestId: request.id, assigneeId: mateo.id })
    expect(await prisma.notification.findFirst({ where: { userId: valentina.id, subject: { contains: "ya no tienes" } } })).toBeTruthy()
    expect(await prisma.notification.findFirst({ where: { userId: mateo.id, subject: { contains: "se te asignó" } } })).toBeTruthy()
  })
})

describe("editar y eliminar persona", () => {
  it("solo el administrador cambia membresías y no puede eliminarse ni borrar al último admin", async () => {
    const area = await prisma.area.create({ data: { name: "Dirección" } })
    const admin = await persona("Admin Persona", "admin.persona@cifes.edu.co", area.id, [], true)
    const otro = await persona("Otro Admin", "otro.admin@cifes.edu.co", area.id, [], true)
    const helena = await persona("Helena Persona", "helena.persona@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "LIDER" }])
    const ana = await persona("Ana Persona", "ana.persona@cifes.edu.co", area.id)
    await expect(guardarRoles(helena, ana.id, { isAdmin: false, active: true, areaId: area.id, memberships: [{ team: "COMERCIAL", role: "LIDER" }] })).rejects.toBeInstanceOf(PermisoDenegado)
    await guardarRoles(admin, ana.id, { isAdmin: false, active: true, areaId: area.id, memberships: [{ team: "INNOVACION", role: "AGENTE" }, { team: "GROWTH", role: "OBSERVADOR" }] })
    const roles = await prisma.areaRole.findMany({ where: { userId: ana.id } })
    expect(roles.map((item) => `${item.role}:${item.team}`).sort()).toEqual(["AGENTE:INNOVACION", "OBSERVADOR:GROWTH"])
    expect(await prisma.auditLog.findFirst({ where: { action: "CAMBIO_ROL", entityId: ana.id } })).toBeTruthy()
    await expect(desactivarPersona(admin, admin.id)).rejects.toThrow(/sí mismo/)
    await expect(desactivarPersona(helena, ana.id)).rejects.toBeInstanceOf(PermisoDenegado)
    await desactivarPersona(admin, otro.id)
    const baja = await prisma.user.findUniqueOrThrow({ where: { id: otro.id } })
    expect(baja.active).toBe(false)
    expect(baja.deactivatedAt).toBeTruthy()
  })
})
