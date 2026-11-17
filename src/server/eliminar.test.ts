import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { PermisoDenegado, type Membership } from "@/lib/domain"
import { obtenerAlmacen, reiniciarAlmacen } from "@/lib/almacen"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import { eliminarRequerimiento, eliminarRequerimientos } from "@/server/requests"
import { eliminarTarea } from "@/server/proyectos"

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
  await prisma.codeSequence.deleteMany()
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
  await reset()
  await asegurarCatalogo()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function persona(name: string, email: string, areaId: string, memberships: Membership[] = [], admin = false) {
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
      areaId,
      areaRoles: { create: memberships },
    },
    include: { areaRoles: true },
  })
  return toActor(user)
}

describe("eliminar requerimientos y tareas", () => {
  it("rechaza a un líder con 403 y no borra el caso", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const lider = await persona("Helena", "helena.eliminar@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "LIDER" }])
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO" } })
    const empresa = await prisma.empresa.findFirstOrThrow({ where: { name: "CIFES" } })
    await prisma.request.create({
      data: {
        code: "DES-0003",
        title: "título",
        description: "Caso que el líder no puede borrar.",
        brand: "CIFES",
        empresaId: empresa.id,
        priority: "MEDIA",
        prioritySuggested: "MEDIA",
        team: "DESARROLLO",
        status: "NUEVO",
        typeId: tipo.id,
        areaId: area.id,
        requesterId: lider.id,
        slaStartedAt: new Date(),
        slaTargetMinutes: 480,
      },
    })
    await expect(eliminarRequerimiento(lider, "DES-0003")).rejects.toBeInstanceOf(PermisoDenegado)
    await expect(eliminarRequerimiento(lider, "DES-0003")).rejects.toMatchObject({ status: 403 })
    expect(await prisma.request.count()).toBe(1)
  })

  it("el administrador borra el requerimiento, sus dependencias y el adjunto, y deja auditoría", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mesa-eliminar-"))
    process.env.STORAGE_DRIVER = "local"
    process.env.UPLOAD_DIR = dir
    reiniciarAlmacen()
    const almacen = await obtenerAlmacen()
    await almacen.guardar("secreto.txt", Buffer.from("adjunto"), "text/plain")
    try {
      const area = await prisma.area.create({ data: { name: "Académico" } })
      const admin = await persona("Admin", "admin.eliminar@cifes.edu.co", area.id, [], true)
      const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO" } })
      const empresa = await prisma.empresa.findFirstOrThrow({ where: { name: "CIFES" } })
      const request = await prisma.request.create({
        data: {
          code: "DES-0003",
          title: "título",
          description: "Caso con historial y un archivo.",
          brand: "CIFES",
          empresaId: empresa.id,
          priority: "MEDIA",
          prioritySuggested: "MEDIA",
          team: "DESARROLLO",
          status: "EN_ANALISIS",
          typeId: tipo.id,
          areaId: area.id,
          requesterId: admin.id,
          slaStartedAt: new Date(),
          slaTargetMinutes: 480,
        },
      })
      const padre = await prisma.tarea.create({
        data: { title: "Revisar el índice", status: "PENDIENTE", requestId: request.id, createdById: admin.id },
      })
      await prisma.tarea.create({
        data: { title: "Subtarea", status: "PENDIENTE", requestId: request.id, parentId: padre.id, createdById: admin.id },
      })
      await prisma.comment.create({ data: { requestId: request.id, authorId: admin.id, body: "Un comentario." } })
      await prisma.activity.create({ data: { requestId: request.id, actorId: admin.id, kind: "STATUS", message: "Cambió.", fromValue: "NUEVO", toValue: "EN_ANALISIS" } })
      await prisma.slaPause.create({ data: { requestId: request.id, startedAt: new Date(), reason: "EN_ESPERA" } })
      await prisma.notification.create({ data: { userId: admin.id, requestId: request.id, subject: "Aviso", body: "Texto" } })
      await prisma.attachment.create({
        data: { requestId: request.id, uploadedById: admin.id, filename: "secreto.txt", storedName: "secreto.txt", mimeType: "text/plain", sizeBytes: 7 },
      })

      await eliminarRequerimiento(admin, "DES-0003")

      expect(await prisma.request.count()).toBe(0)
      expect(await prisma.tarea.count()).toBe(0)
      expect(await prisma.comment.count()).toBe(0)
      expect(await prisma.activity.count()).toBe(0)
      expect(await prisma.slaPause.count()).toBe(0)
      expect(await prisma.notification.count()).toBe(0)
      expect(await prisma.attachment.count()).toBe(0)
      expect(await almacen.leer("secreto.txt")).toBeNull()
      const auditoria = await prisma.auditLog.findFirstOrThrow({ where: { action: "ELIMINAR", entity: "Request" } })
      expect(auditoria.actorId).toBe(admin.id)
      expect(auditoria.toValue).toBe("DES-0003 · título")
      expect(auditoria.createdAt).toBeInstanceOf(Date)
      expect(await prisma.request.findUnique({ where: { id: request.id } })).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("borra una tarea y sus subtareas sin borrar el requerimiento", async () => {
    const area = await prisma.area.create({ data: { name: "Académico" } })
    const admin = await persona("Admin", "admin.tarea@cifes.edu.co", area.id, [], true)
    const agente = await persona("Valentina", "agente.tarea@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
    const tipo = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO" } })
    const empresa = await prisma.empresa.findFirstOrThrow({ where: { name: "CIFES" } })
    const request = await prisma.request.create({
      data: {
        code: "DES-0004",
        title: "Sigue en la lista",
        description: "El caso permanece.",
        brand: "CIFES",
        empresaId: empresa.id,
        priority: "BAJA",
        prioritySuggested: "BAJA",
        team: "DESARROLLO",
        status: "NUEVO",
        typeId: tipo.id,
        areaId: area.id,
        requesterId: admin.id,
        slaStartedAt: new Date(),
        slaTargetMinutes: 480,
      },
    })
    const padre = await prisma.tarea.create({
      data: { title: "Padre", status: "EN_CURSO", requestId: request.id, createdById: admin.id },
    })
    await prisma.tarea.create({
      data: { title: "Hija", status: "PENDIENTE", requestId: request.id, parentId: padre.id, createdById: admin.id },
    })
    await expect(eliminarTarea(agente, padre.id)).rejects.toMatchObject({ status: 403 })
    expect(await prisma.tarea.count()).toBe(2)
    await eliminarTarea(admin, padre.id)
    expect(await prisma.tarea.count()).toBe(0)
    expect(await prisma.request.findUnique({ where: { code: "DES-0004" } })).not.toBeNull()
    const auditoria = await prisma.auditLog.findFirstOrThrow({ where: { entity: "Tarea" } })
    expect(auditoria.actorId).toBe(admin.id)
    expect(auditoria.toValue).toContain("Padre")
    expect(await eliminarRequerimientos(admin, ["DES-0004", "DES-0004"])).toBe(1)
    expect(await prisma.request.count()).toBe(0)
  })
})
