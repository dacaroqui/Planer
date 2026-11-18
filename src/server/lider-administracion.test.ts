import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { asegurarCatalogo, asegurarLiderAdministracion } from "@/server/semilla"

beforeEach(async () => {
  await prisma.areaRole.deleteMany({ where: { team: "ADMINISTRACION" } })
  await prisma.user.deleteMany({ where: { email: "cristianaudit@cifes.edu.co" } })
  await asegurarCatalogo()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("líder de Administración", () => {
  it("asigna a cristianaudit una sola vez y no falla si la cuenta no existe", async () => {
    await expect(asegurarLiderAdministracion()).resolves.toBeUndefined()
    expect(await prisma.areaRole.count({ where: { team: "ADMINISTRACION", role: "LIDER" } })).toBe(0)

    const area = await prisma.area.findFirst() ?? await prisma.area.create({ data: { name: "Dirección de prueba" } })
    await prisma.user.create({
      data: { name: "Cristina Audit", email: "cristianaudit@cifes.edu.co", role: "SOLICITANTE", areaId: area.id },
    })
    await asegurarLiderAdministracion()
    await asegurarLiderAdministracion()
    const roles = await prisma.areaRole.findMany({
      where: { team: "ADMINISTRACION", role: "LIDER", user: { email: "cristianaudit@cifes.edu.co" } },
    })
    expect(roles).toHaveLength(1)
  })
})
