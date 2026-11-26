import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { toActor } from "@/lib/actor"
import { aprobarMeta, crearKpiEnObjetivo, editarCampoKpi, eliminarKpi, guardarKpi, proponerMeta, registrarMedicion } from "@/server/objetivos"

const SUFIJO = ".obj@cifes.edu.co"

async function persona(nombre: string, rol: "LIDER" | "AGENTE" | "ADMIN", team: "MARKETING" | "DESARROLLO" = "MARKETING") {
  const area = await prisma.area.create({ data: { name: `Objetivo ${nombre} ${Date.now()}` } })
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
  await prisma.proyecto.deleteMany({ where: { leader: { email: { endsWith: SUFIJO } } } })
  await prisma.empresa.deleteMany({ where: { name: { startsWith: "Empresa objetivo" } } })
  await prisma.kpiMedicion.deleteMany({ where: { registradoPor: { email: { endsWith: SUFIJO } } } })
  await prisma.kpi.deleteMany({ where: { OR: [{ persona: { email: { endsWith: SUFIJO } } }, { objetivo: { dueno: { email: { endsWith: SUFIJO } } } }] } })
  await prisma.objetivo.deleteMany({ where: { dueno: { email: { endsWith: SUFIJO } } } })
  await prisma.areaRole.deleteMany({ where: { user: { email: { endsWith: SUFIJO } } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: SUFIJO } } })
  await prisma.area.deleteMany({ where: { name: { startsWith: "Objetivo " } } })
})

afterAll(async () => {
  await prisma.$disconnect()
})

const kpiBase = {
  descripcion: "",
  unidad: "%",
  lineaBase: "",
  meta: "",
  actual: "",
  fuente: "manual",
  frecuencia: "SEMANAL" as const,
  nivel: "persona" as const,
  objetivoId: "",
  area: "",
  apoyaId: "",
  bloqueado: false,
  motivoBloqueo: "",
}

describe("permisos y flujo de meta", () => {
  it("limita los KPIs de la persona y solo el administrador aprueba la meta", async () => {
    const personaKpi = await persona("Ana Kpi", "AGENTE")
    const admin = await persona("Admin Kpi", "ADMIN")
    const ajeno = await persona("Luis Kpi", "AGENTE", "DESARROLLO")
    await guardarKpi(personaKpi.actor, { ...kpiBase, nombre: "Principal", tipo: "PRINCIPAL", personaId: personaKpi.id })
    for (const nombre of ["Uno", "Dos", "Tres", "Cuatro"]) {
      await guardarKpi(personaKpi.actor, { ...kpiBase, nombre, tipo: "APOYO", personaId: personaKpi.id })
    }
    await expect(guardarKpi(personaKpi.actor, { ...kpiBase, nombre: "Quinto", tipo: "APOYO", personaId: personaKpi.id })).rejects.toThrow(/cuatro/)
    await expect(guardarKpi(ajeno.actor, { ...kpiBase, nombre: "Ajeno", tipo: "APOYO", personaId: personaKpi.id })).rejects.toBeInstanceOf(PermisoDenegado)
    const propio = await prisma.kpi.findFirstOrThrow({ where: { personaId: personaKpi.id, tipo: "PRINCIPAL" } })
    await registrarMedicion(personaKpi.actor, { kpiId: propio.id, valor: "10", nota: "semana 1", fecha: "2026-11-02" })
    await registrarMedicion(personaKpi.actor, { kpiId: propio.id, valor: "12", nota: "semana 2", fecha: "2026-11-09" })
    await expect(proponerMeta(personaKpi.actor, { kpiId: propio.id, meta: "20" })).rejects.toBeInstanceOf(DomainError)
    await registrarMedicion(personaKpi.actor, { kpiId: propio.id, valor: "11", nota: "semana 3", fecha: "2026-11-16" })
    await proponerMeta(personaKpi.actor, { kpiId: propio.id, meta: "20" })
    await expect(aprobarMeta(personaKpi.actor, propio.id)).rejects.toBeInstanceOf(PermisoDenegado)
    await aprobarMeta(admin.actor, propio.id)
    const aprobado = await prisma.kpi.findUniqueOrThrow({ where: { id: propio.id } })
    expect(aprobado.estadoMeta).toBe("APROBADA")
    expect(Number(aprobado.meta)).toBe(20)
  })

  it("un líder asigna el KPI a otra persona y un agente no", async () => {
    const lider = await persona("Líder Cupo", "LIDER")
    const destino = await persona("Destino Cupo", "AGENTE")
    const agente = await persona("Agente Cupo", "AGENTE", "DESARROLLO")
    const creado = await guardarKpi(lider.actor, { ...kpiBase, nombre: "Principal del destino", tipo: "PRINCIPAL", personaId: destino.id })
    expect(creado.personaId).toBe(destino.id)
    await expect(guardarKpi(agente.actor, { ...kpiBase, nombre: "Ajeno del agente", tipo: "APOYO", personaId: destino.id })).rejects.toBeInstanceOf(PermisoDenegado)
  })

  it("el líder edita el KPI del objetivo y al borrarlo suelta las actividades", async () => {
    const lider = await persona("Líder Inline", "LIDER")
    const ajeno = await persona("Ajeno Inline", "LIDER", "DESARROLLO")
    const objetivo = await prisma.objetivo.create({
      data: {
        marca: "CIFES",
        titulo: "Crecer la escuela",
        area: "MARKETING",
        duenoId: lider.id,
        periodoInicio: new Date("2026-11-01"),
        periodoFin: new Date("2026-12-31"),
      },
    })
    const kpi = await crearKpiEnObjetivo(lider.actor, { objetivoId: objetivo.id, nombre: "Asistencias" })
    await expect(editarCampoKpi(ajeno.actor, { id: kpi.id, campo: "nombre", valor: "Otro" })).rejects.toBeInstanceOf(PermisoDenegado)
    await editarCampoKpi(lider.actor, { id: kpi.id, campo: "unidad", valor: "sesiones" })
    await editarCampoKpi(lider.actor, { id: kpi.id, campo: "meta", valor: "12" })
    await editarCampoKpi(lider.actor, { id: kpi.id, campo: "estado", valor: "APROBADA" })
    const empresa = await prisma.empresa.create({ data: { name: `Empresa objetivo ${Date.now()}` } })
    const proyecto = await prisma.proyecto.create({
      data: {
        name: "Escuela inline",
        empresaId: empresa.id,
        leaderId: lider.id,
        startsAt: new Date("2026-11-01"),
        targetAt: new Date("2026-12-31"),
        team: "MARKETING",
      },
    })
    const tarea = await prisma.tarea.create({
      data: { title: "Clase de ejemplo", projectId: proyecto.id, createdById: lider.id, status: "PENDIENTE", kpiId: kpi.id },
    })
    const borrado = await eliminarKpi(lider.actor, kpi.id)
    expect(borrado.actividades).toBe(1)
    const suelta = await prisma.tarea.findUniqueOrThrow({ where: { id: tarea.id } })
    expect(suelta.kpiId).toBeNull()
    const guardado = await prisma.kpi.findUnique({ where: { id: kpi.id } })
    expect(guardado).toBeNull()
  })

  it("la persona no cambia la meta ni el estado por el editor", async () => {
    const dueno = await persona("Dueña Meta", "AGENTE")
    const admin = await persona("Admin Meta", "ADMIN")
    const creado = await guardarKpi(dueno.actor, { ...kpiBase, nombre: "Principal", tipo: "PRINCIPAL", personaId: dueno.id })
    await expect(editarCampoKpi(dueno.actor, { id: creado.id, campo: "meta", valor: "20" })).rejects.toBeInstanceOf(PermisoDenegado)
    await expect(editarCampoKpi(dueno.actor, { id: creado.id, campo: "estado", valor: "APROBADA" })).rejects.toBeInstanceOf(PermisoDenegado)
    await editarCampoKpi(dueno.actor, { id: creado.id, campo: "nombre", valor: "Principal nuevo" })
    await editarCampoKpi(admin.actor, { id: creado.id, campo: "meta", valor: "20" })
    const actual = await prisma.kpi.findUniqueOrThrow({ where: { id: creado.id } })
    expect(actual.nombre).toBe("Principal nuevo")
    expect(Number(actual.meta)).toBe(20)
  })
})
