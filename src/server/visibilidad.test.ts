import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { DomainError } from "@/lib/domain"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import { puedeRadicar, puedeVerPlanner, equiposVisibles } from "@/lib/permissions"
import { detalleProyecto } from "@/server/proyectos"
import { getDetalle, opcionesVisibles, radicar, transicionar } from "@/server/requests"
import { listarPlanner } from "@/server/planner"

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
  await prisma.invitacion.deleteMany()
  await prisma.restablecimiento.deleteMany()
  await prisma.usuarioEmpresa.deleteMany()
  await prisma.usuarioArea.deleteMany()
  await prisma.areaRole.deleteMany()
  await prisma.codeSequence.deleteMany()
  await prisma.user.deleteMany()
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

describe("H-02 H-03 H-05 H-17 visibilidad", () => {
  it("el observador no radica y el agente de un solo equipo no ve el otro", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Soporte o acceso" } })
    const empresa = await prisma.empresa.findFirstOrThrow({ where: { name: "CIFES" } })
    const ana = toActor(await prisma.user.create({
      data: { name: "Ana", email: "ana.ejemplo@cifes.edu.co", areaId: area.id },
      include: { areaRoles: true },
    }))
    const observador = toActor(await prisma.user.create({
      data: {
        name: "Gerencia",
        email: "gerencia.ejemplo@cifes.edu.co",
        areaId: area.id,
        areaRoles: { create: [{ team: "DESARROLLO", role: "OBSERVADOR" }, { team: "MARKETING", role: "OBSERVADOR" }] },
      },
      include: { areaRoles: true },
    }))
    const agente = toActor(await prisma.user.create({
      data: {
        name: "Valentina",
        email: "valentina.ejemplo@cifes.edu.co",
        areaId: area.id,
        areaRoles: { create: { team: "DESARROLLO", role: "AGENTE" } },
      },
      include: { areaRoles: true },
    }))
    expect(puedeRadicar(observador)).toBe(false)
    expect(puedeRadicar(ana)).toBe(true)
    expect(puedeRadicar(agente)).toBe(true)
    expect(puedeVerPlanner(observador)).toBe(false)
    expect(puedeVerPlanner(ana)).toBe(false)
    expect(puedeVerPlanner(agente)).toBe(true)
    expect(equiposVisibles(agente)).toEqual(["DESARROLLO"])
    await expect(radicar(observador, {
      title: "Intento de observador",
      description: "Un observador no debe poder crear este requerimiento de prueba.",
      team: "DESARROLLO",
      typeId: tipo.id,
      priority: "MEDIA",
      brand: "CIFES",
      declares: true,
    })).rejects.toBeInstanceOf(DomainError)

    const propio = await radicar(ana, {
      title: "Caso de Ana",
      description: "Ana radica su propio caso para el proyecto de visibilidad.",
      team: "DESARROLLO",
      typeId: tipo.id,
      priority: "MEDIA",
      brand: "CIFES",
      declares: true,
    })
    const ajeno = await prisma.user.create({ data: { name: "Julián Secreto", email: "julian.ejemplo@cifes.edu.co", areaId: area.id } })
    const proyecto = await prisma.proyecto.create({
      data: {
        empresaId: empresa.id,
        name: "Proyecto compartido",
        leaderId: agente.id,
        startsAt: new Date("2026-01-01"),
        targetAt: new Date("2026-12-01"),
      },
    })
    await prisma.request.update({ where: { id: propio.id }, data: { projectId: proyecto.id } })
    await prisma.request.create({
      data: {
        code: "MKT-0099",
        title: "Caso ajeno de marketing",
        description: "No debe aparecerle a Ana ni al agente de desarrollo.",
        brand: "LUVANIA",
        empresaId: empresa.id,
        projectId: proyecto.id,
        priority: "MEDIA",
        prioritySuggested: "MEDIA",
        team: "MARKETING",
        status: "NUEVO",
        typeId: (await prisma.requestType.findFirstOrThrow({ where: { team: "MARKETING" } })).id,
        areaId: area.id,
        requesterId: ajeno.id,
        slaStartedAt: new Date(),
        slaTargetMinutes: 60,
      },
    })
    const detalle = await detalleProyecto(ana, proyecto.id)
    expect(detalle?.requests.map((item) => item.code)).toEqual([propio.code])
    expect(JSON.stringify(detalle)).not.toContain("Julián Secreto")
    expect(await getDetalle(agente, "MKT-0099")).toBeNull()
    await prisma.request.update({ where: { id: propio.id }, data: { assigneeId: agente.id } })
    const opciones = await opcionesVisibles(ana)
    expect(opciones.personas.map((item) => item.name)).toEqual(["Ana"])
    expect(opciones.personas.map((item) => item.name)).not.toContain("Julián Secreto")
    expect(opciones.personas.map((item) => item.name)).not.toContain("Valentina")
    const ajenas = await opcionesVisibles(agente)
    expect(ajenas.personas.map((item) => item.name)).not.toContain("Julián Secreto")
    await prisma.tarea.create({
      data: {
        title: "Tarea de marketing",
        projectId: proyecto.id,
        requestId: (await prisma.request.findUniqueOrThrow({ where: { code: "MKT-0099" } })).id,
        assigneeId: ajeno.id,
        createdById: ajeno.id,
        status: "PENDIENTE",
      },
    })
    const planner = await listarPlanner(agente, {})
    expect(planner.map((item) => item.title)).not.toContain("Tarea de marketing")
  })

  it("el canal es obligatorio y no se sale de Nuevo sin proyecto si la empresa lo exige", async () => {
    const area = await prisma.area.create({ data: { name: "Mercadeo" } })
    const pieza = await prisma.requestType.findFirstOrThrow({ where: { team: "MARKETING", name: "Pieza gráfica" } })
    const evento = await prisma.requestType.findFirstOrThrow({ where: { team: "MARKETING", name: "Evento o activación" } })
    const sara = toActor(await prisma.user.create({
      data: { name: "Sara", email: "sara.ejemplo@cifes.edu.co", areaId: area.id, areaRoles: { create: { team: "MARKETING", role: "LIDER" } } },
      include: { areaRoles: true },
    }))
    await expect(radicar(sara, {
      title: "Pieza sin canal",
      description: "Falta el canal y la fecha de publicación de esta pieza de prueba.",
      team: "MARKETING",
      typeId: pieza.id,
      priority: "MEDIA",
      brand: "LUVANIA",
      declares: true,
    })).rejects.toThrow(/canal y la fecha/)
    const eventoReq = await radicar(sara, {
      title: "Activación de prueba",
      description: "Un evento no exige canal ni fecha de publicación en el formulario.",
      team: "MARKETING",
      typeId: evento.id,
      priority: "MEDIA",
      brand: "LUVANIA",
      declares: true,
    })
    expect(eventoReq.status).toBe("NUEVO")
    const empresa = await prisma.empresa.update({ where: { name: "CIFES" }, data: { exigirProyectoAlClasificar: true } })
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Soporte o acceso" } })
    const helena = toActor(await prisma.user.create({
      data: { name: "Helena", email: "helena.ejemplo@cifes.edu.co", areaId: area.id, areaRoles: { create: { team: "DESARROLLO", role: "LIDER" } } },
      include: { areaRoles: true },
    }))
    const ana = toActor(await prisma.user.create({
      data: { name: "Ana", email: "ana.ejemplo@cifes.edu.co", areaId: area.id },
      include: { areaRoles: true },
    }))
    const caso = await radicar(ana, {
      title: "Caso sin proyecto",
      description: "La empresa exige proyecto antes de salir de Nuevo en este caso.",
      team: "DESARROLLO",
      typeId: tipo.id,
      priority: "MEDIA",
      brand: "CIFES",
      empresaId: empresa.id,
      declares: true,
    })
    await expect(transicionar(helena, caso.id, "Iniciar análisis", null)).rejects.toThrow(/proyecto/)
    const proyecto = await prisma.proyecto.create({
      data: { empresaId: empresa.id, name: "Aula", leaderId: helena.id, startsAt: new Date(), targetAt: new Date("2026-12-01") },
    })
    await transicionar(helena, caso.id, "Iniciar análisis", null, { projectId: proyecto.id })
    expect((await prisma.request.findUniqueOrThrow({ where: { id: caso.id } })).status).toBe("EN_ANALISIS")
    await prisma.empresa.update({ where: { id: empresa.id }, data: { exigirProyectoAlClasificar: false } })
  })
})
