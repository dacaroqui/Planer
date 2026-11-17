import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { DomainError } from "@/lib/domain"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import { puedeRadicar, puedeVerPlanner, equiposVisibles } from "@/lib/permissions"
import { detalleProyecto } from "@/server/proyectos"
import { getDetalle, opcionesVisibles, radicar } from "@/server/requests"

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
    const opciones = await opcionesVisibles(ana)
    expect(opciones.personas.map((item) => item.name)).toEqual(["Ana"])
    expect(opciones.personas.map((item) => item.name)).not.toContain("Julián Secreto")
  })
})
