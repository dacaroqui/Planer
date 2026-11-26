import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { toActor } from "@/lib/actor"
import { guardarTarea } from "@/server/proyectos"
import { crearActividadPlan, editarFilaPlan, editarMasivo, listarPlan, moverActividad, reordenarActividades } from "@/server/plan-trabajo"

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
  await prisma.request.deleteMany({ where: { requester: { email: { endsWith: SUFIJO } } } })
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

  it("crea la actividad desde el plan, avisa al responsable y deja el KPI", async () => {
    const lider = await persona("Líder Crea", "LIDER")
    const agente = await persona("Agente Crea", "AGENTE")
    const empresa = await prisma.empresa.create({ data: { name: `Empresa plan crea ${Date.now()}` } })
    const proyecto = await prisma.proyecto.create({
      data: {
        name: "Plan con KPI",
        team: "MARKETING",
        empresaId: empresa.id,
        leaderId: lider.id,
        startsAt: new Date("2026-11-01"),
        targetAt: new Date("2026-11-30"),
      },
    })
    const creada = await crearActividadPlan(lider.actor, {
      proyectoId: proyecto.id,
      titulo: "Publicar la parrilla",
      assigneeId: agente.id,
      horasEstimadas: "6",
      kpiNombre: "Piezas",
      kpiMeta: "4",
      kpiUnidad: "videos",
      kpiActual: "1",
      fechaInicio: "2026-11-02",
      fechaFin: "2026-11-20",
    })
    const fila = await prisma.tarea.findUniqueOrThrow({ where: { id: creada.id } })
    expect(fila.assigneeId).toBe(agente.id)
    expect(Number(fila.horasEstimadas)).toBe(6)
    expect(fila.kpiNombre).toBe("Piezas")
    expect(Number(fila.kpiMeta)).toBe(4)
    expect(fila.fechaInicio).toBeTruthy()
    expect(await prisma.notification.findFirst({ where: { userId: agente.id, subject: { contains: "se te asignó" } } })).toBeTruthy()
    await editarFilaPlan(agente.actor, { id: creada.id, soloAvance: true, horasReales: "2", kpiActual: "3" })
    const avance = await prisma.tarea.findUniqueOrThrow({ where: { id: creada.id } })
    expect(Number(avance.horasReales)).toBe(2)
    expect(Number(avance.kpiActual)).toBe(3)
    await expect(editarFilaPlan(agente.actor, { id: creada.id, status: "EN_CURSO" })).rejects.toBeInstanceOf(PermisoDenegado)
  })

  it("quien no lidera crea la actividad sin responsable y avisa al líder", async () => {
    const lider = await persona("Líder Aviso Plan", "LIDER")
    const agente = await persona("Agente Aviso Plan", "AGENTE")
    const empresa = await prisma.empresa.create({ data: { name: `Empresa plan aviso ${Date.now()}` } })
    const tipo = await prisma.requestType.findFirst({ where: { team: "MARKETING" } })
      ?? await prisma.requestType.create({ data: { team: "MARKETING", name: `Plan ${Date.now()}`, description: "Tipo de prueba del plan" } })
    const proyecto = await prisma.proyecto.create({
      data: {
        name: "Plan del agente",
        team: "MARKETING",
        empresaId: empresa.id,
        leaderId: lider.id,
        startsAt: new Date("2026-11-01"),
        targetAt: new Date("2026-11-30"),
      },
    })
    await prisma.request.create({
      data: {
        code: `MKT-PLAN-${Date.now()}`,
        title: "Caso visible del plan",
        description: "Sirve para que el agente vea el proyecto.",
        brand: "CIFES",
        empresaId: empresa.id,
        projectId: proyecto.id,
        priority: "MEDIA",
        prioritySuggested: "MEDIA",
        team: "MARKETING",
        status: "NUEVO",
        typeId: tipo.id,
        areaId: agente.actor.areaId,
        requesterId: agente.id,
        slaStartedAt: new Date(),
        slaTargetMinutes: 60,
      },
    })
    const creada = await crearActividadPlan(agente.actor, {
      proyectoId: proyecto.id,
      titulo: "Grabar el aula",
      assigneeId: lider.id,
    })
    const fila = await prisma.tarea.findUniqueOrThrow({ where: { id: creada.id } })
    expect(fila.assigneeId).toBeNull()
    const aviso = await prisma.notification.findFirst({ where: { userId: lider.id, subject: { contains: "sin responsable" } } })
    expect(aviso?.subject).toContain("Grabar el aula")
  })

  it("reordena y mueve actividades y respeta el permiso del líder", async () => {
    const lider = await persona("Líder Orden", "LIDER")
    const agente = await persona("Agente Orden", "AGENTE")
    const empresa = await prisma.empresa.create({ data: { name: `Empresa plan orden ${Date.now()}` } })
    const base = { empresaId: empresa.id, leaderId: lider.id, team: "MARKETING" as const, startsAt: new Date("2026-11-01"), targetAt: new Date("2026-11-30") }
    const origen = await prisma.proyecto.create({ data: { ...base, name: "Origen orden" } })
    const destino = await prisma.proyecto.create({ data: { ...base, name: "Destino orden" } })
    const primera = await prisma.tarea.create({ data: { title: "Primera actividad", projectId: origen.id, createdById: lider.id, status: "PENDIENTE", orden: 0, fechaInicio: new Date("2026-11-02") } })
    const segunda = await prisma.tarea.create({ data: { title: "Segunda actividad", projectId: origen.id, createdById: lider.id, status: "PENDIENTE", orden: 1, fechaInicio: new Date("2026-11-03") } })
    await expect(reordenarActividades(agente.actor, [segunda.id, primera.id])).rejects.toBeInstanceOf(PermisoDenegado)
    await reordenarActividades(lider.actor, [segunda.id, primera.id])
    const ordenadas = await prisma.tarea.findMany({ where: { projectId: origen.id }, orderBy: { orden: "asc" } })
    expect(ordenadas.map((item) => item.id)).toEqual([segunda.id, primera.id])
    await expect(moverActividad(agente.actor, { id: primera.id, projectId: destino.id, parentId: null })).rejects.toBeInstanceOf(PermisoDenegado)
    await moverActividad(lider.actor, { id: primera.id, projectId: destino.id, parentId: null })
    const movida = await prisma.tarea.findUniqueOrThrow({ where: { id: primera.id } })
    expect(movida.projectId).toBe(destino.id)
    await moverActividad(lider.actor, { id: primera.id, projectId: origen.id, parentId: segunda.id })
    const anidada = await prisma.tarea.findUniqueOrThrow({ where: { id: primera.id } })
    expect(anidada.parentId).toBe(segunda.id)
    await expect(editarMasivo(agente.actor, { ids: [segunda.id], status: "EN_CURSO" })).rejects.toBeInstanceOf(PermisoDenegado)
    await editarMasivo(lider.actor, { ids: [segunda.id], status: "EN_CURSO" })
    expect((await prisma.tarea.findUniqueOrThrow({ where: { id: segunda.id } })).status).toBe("EN_CURSO")
  })

  it("rechaza una actividad nueva sin proyecto", async () => {
    const lider = await persona("Líder Suelta", "LIDER")
    await expect(guardarTarea(lider.actor, { title: "Actividad suelta", status: "PENDIENTE" })).rejects.toThrow(/proyecto/)
  })
})
