import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { asegurarCatalogo } from "@/server/semilla"
import { resolverAdjunto } from "@/server/adjuntos"

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

describe("H-01 autorización de adjuntos", () => {
  it("niega a quien no puede ver el requerimiento y no revela el nombre interno", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const dueno = await prisma.user.create({ data: { name: "Ana", email: "ana.ejemplo@cifes.edu.co", areaId: area.id } })
    const ajeno = await prisma.user.create({ data: { name: "Julián", email: "julian.ejemplo@cifes.edu.co", areaId: area.id } })
    const agente = await prisma.user.create({
      data: {
        name: "Valentina",
        email: "valentina.ejemplo@cifes.edu.co",
        areaId: area.id,
        areaRoles: { create: { team: "DESARROLLO", role: "AGENTE" } },
      },
    })
    const admin = await prisma.user.create({
      data: { name: "Admin", email: "admin.ejemplo@cifes.edu.co", areaId: area.id, role: "ADMINISTRADOR" },
    })
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO" } })
    const empresa = await prisma.empresa.findFirstOrThrow()
    const request = await prisma.request.create({
      data: {
        code: "DES-0099",
        title: "Caso con adjunto",
        description: "Solo lo ve quien puede ver el requerimiento.",
        brand: "CIFES",
        empresaId: empresa.id,
        priority: "MEDIA",
        prioritySuggested: "MEDIA",
        team: "DESARROLLO",
        status: "NUEVO",
        typeId: tipo.id,
        areaId: area.id,
        requesterId: dueno.id,
        slaStartedAt: new Date(),
        slaTargetMinutes: 60,
      },
    })
    const file = await prisma.attachment.create({
      data: {
        requestId: request.id,
        uploadedById: dueno.id,
        filename: "evidencia.pdf",
        storedName: "secreto-interno-abc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
      },
    })
    expect(await resolverAdjunto(null, file.id)).toEqual({ status: 401 })
    const negado = await resolverAdjunto(ajeno.email, file.id)
    expect(negado.status).toBe(404)
    expect(JSON.stringify(negado)).not.toContain("secreto-interno")
    const propio = await resolverAdjunto(dueno.email, file.id)
    expect(propio.status).toBe(200)
    expect(await resolverAdjunto(agente.email, file.id)).toMatchObject({ status: 200, filename: "evidencia.pdf" })
    expect(await resolverAdjunto(admin.email, file.id)).toMatchObject({ status: 200 })
  })
})
