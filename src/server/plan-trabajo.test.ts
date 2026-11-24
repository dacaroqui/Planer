import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { toActor } from "@/lib/actor"
import { editarFilaPlan, listarPlan } from "@/server/plan-trabajo"

const SUFIJO = ".plan@cifes.edu.co"

async function persona(nombre: string, rol: "LIDER" | "AGENTE" | "ADMIN", team: "MARKETING" | "DESARROLLO" = "MARKETING") {
  const area = await prisma.area.create({ data: { name: `PlanTrabajo ${nombre} ${Date.now()}` } })
  const user = await prisma.user.create({
    data: {
      name: nombre,
      email: `${nombre.toLowerCase().replaceAll(" ", ".")}${SUFIJO}`,
      role: rol === "ADMIN" ? "ADMINISTRADOR" : "SOLICITANTE",
      areaId: area.id,
      ...(rol === "ADMIN" ? {} : { areaRoles: { create: [{ team, role: rol }] } }),
    },
    include: { areaRoles: true },
  })
  return { actor: toActor(user), id: user.id }
}

beforeEach(async () => {
  await prisma.notification.deleteMany({ where: { user: { email: { endsWith: SUFIJO } } } })
  await prisma.tarea.deleteMany({ where: { createdBy: { email: { endsWith: SUFIJO } } } })
  await prisma.proyecto.deleteMany({ where: { leader: { email: { endsWith: SUFIJO } } } })
  await prisma.areaRole.deleteMany({ where: { user: { email: { endsWith: SUFIJO } } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: SUFIJO } } })
  await prisma.empresa.deleteMany({ where: { name: { startsWith: "Empresa plan" } } })
  await prisma.empresa.deleteMany({ where: { name: { startsWith: "Empresa aviso" } } })
  await prisma.area.deleteMany({ where: { name: { startsWith: "PlanTrabajo " } } })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("permisos del plan de trabajo", () => {
  it("un líder ve el proyecto de su área y un agente no edita la fila", async () => {
    const lider = await persona("Líder Plan", "LIDER")
    const agente = await persona("Agente Plan", "AGENTE")
    const empresa = await prisma.empresa.create({ data: { name: `Empresa plan ${Date.now()}` } })
    const proyecto = await prisma.proyecto.create({
      data: {
        name: "Escuela de prueba",
        description: "Área: Marketing",
        team: "MARKETING",
        empresaId: empresa.id,
        leaderId: lider.id,
        startsAt: new Date("2026-11-01"),
        targetAt: new Date("2026-11-30"),
      },
    })
    const tarea = await prisma.tarea.create({
      data: {
        title: "Parrilla mensual — Participantes: Valeria — Bloqueo: Aviso",
        projectId: proyecto.id,
        createdById: lider.id,
        status: "PENDIENTE",
      },
    })
    const visto = await listarPlan(lider.actor)
    expect(visto.map((fila) => fila.actividad)).toContain("Parrilla mensual")
    expect(visto.find((fila) => fila.id === tarea.id)?.bloqueo).toBe("Aviso")
    expect(visto.find((fila) => fila.id === tarea.id)?.puedeEditar).toBe(true)
    const delAgente = await listarPlan(agente.actor)
    expect(delAgente.find((fila) => fila.id === tarea.id)?.puedeEditar ?? false).toBe(false)
    await expect(editarFilaPlan(agente.actor, { id: tarea.id, bloqueo: "Otro" })).rejects.toBeInstanceOf(PermisoDenegado)
    await expect(editarFilaPlan(lider.actor, { id: tarea.id, status: "HECHA" })).rejects.toBeInstanceOf(DomainError)
    await editarFilaPlan(lider.actor, { id: tarea.id, status: "EN_CURSO", bloqueo: "Guion" })
    const actual = await prisma.tarea.findUniqueOrThrow({ where: { id: tarea.id } })
    expect(actual.status).toBe("EN_CURSO")
    expect(actual.bloqueo).toBe("Guion")
    expect(actual.title).toContain("Participantes")
  })

  it("avisa al asignar el responsable y niega el plan a quien no ve el proyecto", async () => {
    const lider = await persona("Líder Aviso", "LIDER", "MARKETING")
    const agente = await persona("Agente Aviso", "AGENTE", "MARKETING")
    const ajeno = await persona("Agente Ajeno", "AGENTE", "DESARROLLO")
    const empresa = await prisma.empresa.create({ data: { name: `Empresa aviso ${Date.now()}` } })
    const proyecto = await prisma.proyecto.create({
      data: {
        name: "Plan aislado",
        team: "MARKETING",
        empresaId: empresa.id,
        leaderId: lider.id,
        startsAt: new Date("2026-11-01"),
        targetAt: new Date("2026-11-30"),
      },
    })
    const tarea = await prisma.tarea.create({
      data: { title: "Crear la pauta", projectId: proyecto.id, createdById: lider.id },
    })
    expect(await listarPlan(ajeno.actor)).toEqual([])
    await expect(editarFilaPlan(ajeno.actor, { id: tarea.id, assigneeId: agente.id })).rejects.toBeInstanceOf(PermisoDenegado)
    await editarFilaPlan(lider.actor, { id: tarea.id, assigneeId: agente.id })
    const aviso = await prisma.notification.findFirst({ where: { userId: agente.id, subject: { contains: "se te asignó" } } })
    expect(aviso?.subject).toContain("Crear la pauta")
    expect(aviso?.href).toBe("/planner")
  })
})
