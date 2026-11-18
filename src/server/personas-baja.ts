import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado, TERMINAL_STATUSES, type Actor } from "@/lib/domain"
import { puedeAdministrar } from "@/lib/permissions"

const ABIERTOS = { notIn: [...TERMINAL_STATUSES] }

export async function cargaAbierta(userId: string) {
  const [requerimientos, tareas] = await Promise.all([
    prisma.request.count({ where: { assigneeId: userId, status: ABIERTOS } }),
    prisma.tarea.count({ where: { assigneeId: userId, status: { not: "HECHA" } } }),
  ])
  return { requerimientos, tareas, total: requerimientos + tareas }
}

export async function desactivarPersona(actor: Actor, userId: string, reasignarA?: string | null) {
  if (!puedeAdministrar(actor)) throw new PermisoDenegado()
  if (actor.id === userId) throw new DomainError("No puede eliminarse a sí mismo.")
  const persona = await prisma.user.findUnique({ where: { id: userId } })
  if (!persona) throw new DomainError("La persona no existe.")
  if (!persona.active || persona.deactivatedAt) throw new DomainError("Esa persona ya está inactiva.")
  if (persona.role === "ADMINISTRADOR") {
    const admins = await prisma.user.count({ where: { role: "ADMINISTRADOR", active: true, deactivatedAt: null } })
    if (admins <= 1) throw new DomainError("No puede eliminar al último administrador.")
  }
  const carga = await cargaAbierta(userId)
  if (carga.total > 0 && !reasignarA) {
    throw new DomainError("Reasigne los requerimientos y tareas abiertos antes de eliminar a la persona.")
  }
  if (reasignarA) {
    if (reasignarA === userId) throw new DomainError("Elija otra persona para la reasignación.")
    const destino = await prisma.user.findFirst({ where: { id: reasignarA, active: true, deactivatedAt: null } })
    if (!destino) throw new DomainError("La persona que recibe el trabajo no está activa.")
    const ahora = new Date()
    await prisma.$transaction(async (tx) => {
      const casos = await tx.request.findMany({ where: { assigneeId: userId, status: ABIERTOS }, select: { id: true, code: true } })
      const tareas = await tx.tarea.findMany({ where: { assigneeId: userId, status: { not: "HECHA" } }, select: { id: true, title: true, requestId: true } })
      if (casos.length) await tx.request.updateMany({ where: { id: { in: casos.map((item) => item.id) } }, data: { assigneeId: destino.id, updatedAt: ahora } })
      if (tareas.length) await tx.tarea.updateMany({ where: { id: { in: tareas.map((item) => item.id) } }, data: { assigneeId: destino.id } })
      for (const caso of casos) {
        await tx.activity.create({
          data: {
            requestId: caso.id,
            actorId: actor.id,
            kind: "REGISTRO",
            field: "responsable",
            message: `${actor.name} asignó a ${destino.name}.`,
          },
        })
        if (destino.id !== actor.id) {
          await tx.notification.create({
            data: {
              userId: destino.id,
              requestId: caso.id,
              subject: `${caso.code} · Se te asignó`,
              body: `${actor.name} le dejó ${caso.code} al desactivar a ${persona.name}.`,
              dedupeKey: `baja-${persona.id}-${caso.id}`,
            },
          })
        }
      }
      await tx.user.update({
        where: { id: persona.id },
        data: { active: false, deactivatedAt: ahora, deactivatedById: actor.id },
      })
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "DESACTIVAR", entity: "User", entityId: persona.id, toValue: persona.name },
      })
    })
    return
  }
  const ahora = new Date()
  await prisma.$transaction([
    prisma.user.update({ where: { id: persona.id }, data: { active: false, deactivatedAt: ahora, deactivatedById: actor.id } }),
    prisma.auditLog.create({ data: { actorId: actor.id, action: "DESACTIVAR", entity: "User", entityId: persona.id, toValue: persona.name } }),
  ])
}

export async function reactivarPersona(actor: Actor, userId: string) {
  if (!puedeAdministrar(actor)) throw new PermisoDenegado()
  const persona = await prisma.user.findUnique({ where: { id: userId } })
  if (!persona) throw new DomainError("La persona no existe.")
  if (persona.active && !persona.deactivatedAt) throw new DomainError("Esa persona ya está activa.")
  await prisma.$transaction([
    prisma.user.update({ where: { id: persona.id }, data: { active: true, deactivatedAt: null, deactivatedById: null } }),
    prisma.auditLog.create({ data: { actorId: actor.id, action: "REACTIVAR", entity: "User", entityId: persona.id, toValue: persona.name } }),
  ])
}
