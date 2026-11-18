import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { PermisoDenegado } from "@/lib/domain"
import { toActor } from "@/lib/actor"
import { asegurarCatalogo } from "@/server/semilla"
import { vistaGrowth, avanzarExperimento, crearExperimento } from "@/server/growth"

async function persona(admin: boolean, growth: boolean) {
  const area = await prisma.area.create({ data: { name: `Área ${admin ? "admin" : growth ? "growth" : "mkt"} ${Date.now()}` } })
  const user = await prisma.user.create({
    data: {
      name: admin ? "Admin Growth" : growth ? "Agente Growth" : "Agente Marketing",
      email: `${admin ? "admin" : growth ? "growth" : "mkt"}.growth@cifes.edu.co`,
      role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
      areaId: area.id,
      areaRoles: growth ? { create: [{ team: "GROWTH", role: "AGENTE" }] } : { create: [{ team: "MARKETING", role: "AGENTE" }] },
    },
    include: { areaRoles: true },
  })
  return toActor(user)
}

beforeEach(async () => {
  await prisma.growthComentario.deleteMany()
  await prisma.growthEnlace.deleteMany()
  await prisma.tarea.deleteMany({ where: { experimentoId: { not: null } } })
  await prisma.growthExperimento.deleteMany()
  await prisma.growthEtapa.deleteMany()
  await prisma.growthEmbudo.deleteMany()
  await prisma.growthCiclo.deleteMany()
  await prisma.areaRole.deleteMany({ where: { user: { email: { endsWith: ".growth@cifes.edu.co" } } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: ".growth@cifes.edu.co" } } })
  await asegurarCatalogo()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("Growth servidor", () => {
  it("niega la vista a quien no es de Growth y la abre al agente y al admin", async () => {
    const marketing = await persona(false, false)
    const growth = await persona(false, true)
    const admin = await persona(true, false)
    await expect(vistaGrowth(marketing, {})).rejects.toBeInstanceOf(PermisoDenegado)
    await expect(vistaGrowth(growth, {})).resolves.toMatchObject({ experimentos: [] })
    await expect(vistaGrowth(admin, {})).resolves.toBeTruthy()
  })

  it("recorre el flujo y exige decisión al cerrar", async () => {
    const growth = await persona(false, true)
    const ciclo = await prisma.growthCiclo.create({ data: { nombre: "Ciclo 01", brand: "LUVANIA", activo: true } })
    const creado = await crearExperimento(growth, {
      nombre: "Probar horarios",
      brand: "LUVANIA",
      cicloId: ciclo.id,
      etapaEmbudo: "Asistencia",
      metrica: "tasa de asistencia",
      problema: "La gente no llega.",
      donde: "Agenda",
      datos: "60 %",
      explicacion: "Los huecos no se ven.",
      referencia: "Recordatorio",
      mecanismo: "Confirmar el día anterior.",
      porque: "Sube la asistencia.",
      valorInicial: "60",
      meta: "75",
      comparacion: "ciclo anterior",
      duracion: "14 días",
    })
    expect(creado.estado).toBe("BORRADOR")
    await avanzarExperimento(growth, creado.id)
    await avanzarExperimento(growth, creado.id)
    await avanzarExperimento(growth, creado.id)
    await avanzarExperimento(growth, creado.id)
    await expect(avanzarExperimento(growth, creado.id)).rejects.toThrow(/Adoptar/)
    const cerrado = await avanzarExperimento(growth, creado.id, "ITERAR")
    expect(cerrado.estado).toBe("CERRADO")
    expect(cerrado.decision).toBe("ITERAR")
  })
})
