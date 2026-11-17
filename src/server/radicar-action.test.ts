import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import { radicarDesdeFormulario } from "@/server/radicar-formulario"

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

function formulario(tipoId: string, declares?: string) {
  const data = new FormData()
  data.set("title", "Acceso al aula de la cohorte")
  data.set("description", "La coordinadora de prueba no puede entrar al aula de la cohorte de demostración.")
  data.set("team", "DESARROLLO")
  data.set("typeId", tipoId)
  data.set("priority", "MEDIA")
  data.set("brand", "CIFES")
  if (declares) data.set("declares", declares)
  return data
}

describe("radicarAction", () => {
  it("radica cuando el formulario marca la casilla de datos personales", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const user = await prisma.user.create({
      data: { name: "Ana Ejemplo", email: "ana.ejemplo@cifes.edu.co", areaId: area.id, role: "SOLICITANTE" },
      include: { areaRoles: true },
    })
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Soporte o acceso" } })
    const result = await radicarDesdeFormulario(toActor(user), formulario(tipo.id, "1"))
    expect(result).toEqual({ ok: true, code: "DES-0001" })
    const request = await prisma.request.findUniqueOrThrow({ where: { code: "DES-0001" } })
    expect(request.declaresNoPersonalData).toBe(true)
    expect(request.status).toBe("NUEVO")
    expect(request.requesterId).toBe(user.id)
  })

  it("rechaza el formulario si falta la casilla", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const user = await prisma.user.create({
      data: { name: "Ana Ejemplo", email: "ana.ejemplo@cifes.edu.co", areaId: area.id, role: "SOLICITANTE" },
      include: { areaRoles: true },
    })
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Soporte o acceso" } })
    const result = await radicarDesdeFormulario(toActor(user), formulario(tipo.id))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/datos personales/)
    expect(await prisma.request.count()).toBe(0)
  })
})
