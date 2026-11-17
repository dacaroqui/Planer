import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import {
  aceptarInvitacion,
  crearInvitacion,
  intentarIngreso,
  leerInvitacion,
  registrarCuenta,
} from "@/server/cuentas"
import { DomainError } from "@/lib/domain"

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
  await prisma.user.deleteMany()
  await prisma.empresa.updateMany({ data: { exigirProyectoAlClasificar: false } })
  await prisma.area.deleteMany()
}

beforeEach(async () => {
  process.env.BCRYPT_ROUNDS = "4"
  await reset()
  await asegurarCatalogo()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function admin() {
  const area = await prisma.area.create({ data: { name: "Dirección" } })
  const user = await prisma.user.create({
    data: { name: "Admin Ejemplo", email: "admin.ejemplo@cifes.edu.co", role: "ADMINISTRADOR", areaId: area.id },
    include: { areaRoles: true },
  })
  return { actor: toActor(user), area }
}

describe("RQ-52 RQ-54 autenticación e invitación", () => {
  it("la invitación se usa una vez y deja la cuenta con el rol del enlace", async () => {
    const { actor, area } = await admin()
    const creada = await crearInvitacion(actor, {
      email: "nueva.ejemplo@cifes.edu.co",
      rol: "LIDER",
      areaId: area.id,
      areaIds: [area.id],
      empresaIds: [],
      teams: ["DESARROLLO"],
    })
    const token = creada.enlace.split("/").pop() || ""
    expect(await leerInvitacion(token)).toMatchObject({ email: "nueva.ejemplo@cifes.edu.co", role: "LIDER" })
    await aceptarInvitacion(token, "Nueva Ejemplo", "clave-segura")
    const ingreso = await intentarIngreso("nueva.ejemplo@cifes.edu.co", "clave-segura")
    expect(ingreso.ok).toBe(true)
    const roles = await prisma.areaRole.findMany({ where: { user: { email: "nueva.ejemplo@cifes.edu.co" } } })
    expect(roles).toEqual([expect.objectContaining({ team: "DESARROLLO", role: "LIDER" })])
    await expect(aceptarInvitacion(token, "Nueva Ejemplo", "clave-segura")).rejects.toBeInstanceOf(DomainError)
    const auditoria = await prisma.auditLog.findMany({ where: { action: "INVITACION" } })
    expect(auditoria).toHaveLength(1)
  })

  it("guarda solo el equipo marcado en cada invitación", async () => {
    const { actor, area } = await admin()
    await crearInvitacion(actor, { email: "mkt.ejemplo@cifes.edu.co", rol: "LIDER", areaId: area.id, areaIds: [], empresaIds: [], teams: ["MARKETING"] })
    await crearInvitacion(actor, { email: "dev.ejemplo@cifes.edu.co", rol: "AGENTE", areaId: area.id, areaIds: [], empresaIds: [], teams: ["DESARROLLO"] })
    const filas = await prisma.invitacion.findMany()
    const marketing = filas.find((item) => item.email.startsWith("mkt"))
    const desarrollo = filas.find((item) => item.email.startsWith("dev"))
    expect(JSON.parse(marketing?.memberships || "[]")).toEqual([{ team: "MARKETING", role: "LIDER" }])
    expect(JSON.parse(desarrollo?.memberships || "[]")).toEqual([{ team: "DESARROLLO", role: "AGENTE" }])
  })

  it("bloquea la cuenta tras cinco contraseñas incorrectas", async () => {
    const { area } = await admin()
    const { hashClave } = await import("@/lib/clave")
    await prisma.user.create({
      data: {
        name: "Ana Ejemplo",
        email: "ana.ejemplo@cifes.edu.co",
        role: "SOLICITANTE",
        areaId: area.id,
        passwordHash: await hashClave("clave-segura"),
      },
    })
    for (let i = 0; i < 4; i += 1) {
      const fallo = await intentarIngreso("ana.ejemplo@cifes.edu.co", "mala-clave")
      expect(fallo).toEqual({ ok: false, code: "credenciales" })
    }
    const quinto = await intentarIngreso("ana.ejemplo@cifes.edu.co", "mala-clave")
    expect(quinto).toEqual({ ok: false, code: "bloqueado" })
    const buena = await intentarIngreso("ana.ejemplo@cifes.edu.co", "clave-segura")
    expect(buena).toEqual({ ok: false, code: "bloqueado" })
  })

  it("un solicitante no invita y el pendiente no entra", async () => {
    const { actor, area } = await admin()
    const solicitante = toActor(await prisma.user.create({
      data: { name: "Ana Ejemplo", email: "ana.ejemplo@cifes.edu.co", areaId: area.id, role: "SOLICITANTE" },
      include: { areaRoles: true },
    }))
    await expect(crearInvitacion(solicitante, {
      email: "otra.ejemplo@cifes.edu.co",
      rol: "SOLICITANTE",
      areaId: area.id,
      areaIds: [],
      empresaIds: [],
      teams: [],
    })).rejects.toBeInstanceOf(DomainError)

    process.env.REGISTRO_PUBLICO = "true"
    await registrarCuenta({ name: "Pendiente Ejemplo", email: "pendiente.ejemplo@cifes.edu.co", password: "clave-segura" })
    delete process.env.REGISTRO_PUBLICO
    const ingreso = await intentarIngreso("pendiente.ejemplo@cifes.edu.co", "clave-segura")
    expect(ingreso).toEqual({ ok: false, code: "pendiente" })
    expect(actor.role).toBe("ADMINISTRADOR")
  })

  it("rechaza una invitación vencida", async () => {
    const { actor, area } = await admin()
    const creada = await crearInvitacion(actor, {
      email: "vence.ejemplo@cifes.edu.co",
      rol: "SOLICITANTE",
      areaId: area.id,
      areaIds: [],
      empresaIds: [],
      teams: [],
    })
    const token = creada.enlace.split("/").pop() || ""
    await prisma.invitacion.updateMany({ data: { expiresAt: new Date("2020-01-01") } })
    expect(await leerInvitacion(token)).toBeNull()
    await expect(aceptarInvitacion(token, "Vence Ejemplo", "clave-segura")).rejects.toThrow(/venció/)
  })

  it("guarda el cargo y exige aceptar la política", async () => {
    const { actor, area } = await admin()
    const creada = await crearInvitacion(actor, {
      email: "perfil.ejemplo@cifes.edu.co",
      rol: "AGENTE",
      areaId: area.id,
      areaIds: [area.id],
      empresaIds: [],
      teams: ["DESARROLLO"],
    })
    const token = creada.enlace.split("/").pop() || ""
    await expect(aceptarInvitacion(token, "Perfil Ejemplo", "clave-segura", { aceptaPolitica: false })).rejects.toThrow(/tratamiento de datos/)
    await aceptarInvitacion(token, "Perfil Ejemplo", "clave-segura", { aceptaPolitica: true, cargo: "Coordinadora" })
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "perfil.ejemplo@cifes.edu.co" } })
    expect(user.cargo).toBe("Coordinadora")
    expect(user.areaId).toBe(area.id)
  })
})