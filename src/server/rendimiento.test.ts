import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import type { Actor, Membership } from "@/lib/domain"
import { prisma } from "@/lib/prisma"
import type { FiltrosRendimiento } from "@/lib/rendimiento"
import { toActor } from "@/lib/actor"
import { tableroRendimiento } from "@/server/rendimiento"
import { ZONE } from "@/lib/time"

const bogota = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toJSDate()

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
  await prisma.slaPolicy.deleteMany()
  await prisma.requestType.deleteMany()
  await prisma.workflowTransition.deleteMany()
  await prisma.workflowState.deleteMany()
  await prisma.catalogItem.deleteMany()
  await prisma.empresa.deleteMany()
  await prisma.area.deleteMany()
}

beforeEach(reset)
afterAll(async () => {
  await prisma.$disconnect()
})

function filtros(partial: Partial<FiltrosRendimiento> = {}): FiltrosRendimiento {
  return { periodo: "mes", personas: [], orden: "nombre", dir: "asc", ...partial }
}

async function mundo() {
  const area = await prisma.area.create({ data: { name: "Tecnología" } })
  const empresa = await prisma.empresa.create({ data: { name: "CIFES" } })
  const desarrollo = await prisma.requestType.create({ data: { team: "DESARROLLO", name: "Error (bug)", description: "Fallo de prueba." } })
  const marketing = await prisma.requestType.create({ data: { team: "MARKETING", name: "Pieza gráfica", description: "Pieza de prueba." } })
  async function persona(name: string, email: string, memberships: Membership[] = [], admin = false) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
        areaId: area.id,
        areaRoles: { create: memberships.map((item) => ({ team: item.team, role: item.role })) },
      },
      include: { areaRoles: true },
    })
    return { actor: toActor(user), id: user.id }
  }
  const ana = await persona("Ana Ejemplo", "ana.ejemplo@cifes.edu.co")
  const valentina = await persona("Valentina Ejemplo", "valentina.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "AGENTE" }])
  const camila = await persona("Camila Ejemplo", "camila.ejemplo@cifes.edu.co", [{ team: "MARKETING", role: "AGENTE" }])
  const helena = await persona("Helena Ejemplo", "helena.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "LIDER" }])
  const sara = await persona("Sara Ejemplo", "sara.ejemplo@cifes.edu.co", [{ team: "MARKETING", role: "LIDER" }])
  const dual = await persona("Dual Ejemplo", "dual.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "AGENTE" }, { team: "MARKETING", role: "AGENTE" }])
  const admin = await persona("Admin Ejemplo", "admin.ejemplo@cifes.edu.co", [], true)
  const observador = await persona("Gerencia Ejemplo", "gerencia.ejemplo@cifes.edu.co", [{ team: "DESARROLLO", role: "OBSERVADOR" }])
  async function caso(input: {
    code: string
    team: "DESARROLLO" | "MARKETING"
    assigneeId: string
    createdAt: Date
    resolvedAt?: Date | null
    status?: string
    slaStartedAt?: Date
    target?: number
    typeId?: string
  }) {
    const cerrado = (input.status ?? "CERRADO") === "CERRADO"
    return prisma.request.create({
      data: {
        code: input.code,
        title: input.code,
        description: "Caso de prueba del rendimiento, sin personas reales.",
        brand: "CIFES",
        empresaId: empresa.id,
        priority: "MEDIA",
        prioritySuggested: "MEDIA",
        team: input.team,
        status: input.status ?? "CERRADO",
        typeId: input.typeId ?? (input.team === "DESARROLLO" ? desarrollo.id : marketing.id),
        areaId: area.id,
        requesterId: ana.id,
        assigneeId: input.assigneeId,
        declaresNoPersonalData: true,
        slaStartedAt: input.slaStartedAt ?? input.createdAt,
        slaTargetMinutes: input.target ?? 4800,
        resolutionMinutes: input.target ?? 4800,
        resolvedAt: input.resolvedAt === undefined ? (cerrado ? input.createdAt : null) : input.resolvedAt,
        closedAt: cerrado ? (input.resolvedAt === undefined ? input.createdAt : input.resolvedAt) : null,
        createdAt: input.createdAt,
      },
    })
  }
  return { ana, valentina, camila, helena, sara, dual, admin, observador, caso }
}

describe("alcance guardado en la base", () => {
  it("un líder ve su equipo, un agente solo su fila y el administrador los dos equipos", async () => {
    const { valentina, camila, helena, sara, dual, admin, observador, caso } = await mundo()
    const cuando = bogota("2026-11-12T11:00:00")
    await caso({ code: "DES-1001", team: "DESARROLLO", assigneeId: valentina.id, createdAt: cuando })
    await caso({ code: "MKT-1001", team: "MARKETING", assigneeId: camila.id, createdAt: cuando })
    await caso({ code: "DES-1002", team: "DESARROLLO", assigneeId: dual.id, createdAt: cuando })
    await caso({ code: "MKT-1002", team: "MARKETING", assigneeId: dual.id, createdAt: cuando })
    const ahora = bogota("2026-11-18T15:00:00")

    const deHelena = await tableroRendimiento(helena.actor, filtros(), ahora)
    const deSara = await tableroRendimiento(sara.actor, filtros(), ahora)
    const deAdmin = await tableroRendimiento(admin.actor, filtros(), ahora)
    const deValentina = await tableroRendimiento(valentina.actor, filtros({ personas: [camila.id] }), ahora)
    const deObservador = await tableroRendimiento(observador.actor, filtros(), ahora)
    const solicitante: Actor = { ...observador.actor, id: "sol", role: "SOLICITANTE", isAdmin: false, memberships: [] }
    const deSolicitante = await tableroRendimiento(solicitante, filtros(), ahora)

    expect(deObservador.denegado).toBe(true)
    expect(deSolicitante.denegado).toBe(true)
    if (deHelena.denegado || deSara.denegado || deAdmin.denegado || deValentina.denegado) throw new Error("acceso")

    expect(deHelena.filas.map((fila) => fila.id).sort()).toEqual([dual.id, helena.id, valentina.id].sort())
    expect(deHelena.filas.find((fila) => fila.id === dual.id)?.asignados).toBe(1)
    expect(deHelena.filas.some((fila) => fila.id === camila.id)).toBe(false)
    expect(deHelena.resumen.completados).toBe(2)

    expect(deSara.filas.find((fila) => fila.id === dual.id)?.asignados).toBe(1)
    expect(deSara.filas.some((fila) => fila.id === valentina.id)).toBe(false)

    expect(deAdmin.filas.find((fila) => fila.id === dual.id)?.asignados).toBe(2)
    expect(deAdmin.resumen.completados).toBe(4)

    expect(deValentina.filas.map((fila) => fila.id)).toEqual([valentina.id])
    expect(deValentina.filas[0].asignados).toBe(1)
  })

  it("arrastra la pausa y respeta el lunes de Colombia", async () => {
    const { valentina, helena, caso } = await mundo()
    const inicio = bogota("2026-11-09T08:00:00")
    const pausado = await caso({
      code: "DES-2001",
      team: "DESARROLLO",
      assigneeId: valentina.id,
      createdAt: inicio,
      slaStartedAt: inicio,
      resolvedAt: bogota("2026-11-10T18:00:00"),
      target: 12 * 60,
    })
    await prisma.slaPause.create({
      data: {
        requestId: pausado.id,
        startedAt: bogota("2026-11-10T10:00:00"),
        endedAt: bogota("2026-11-10T16:00:00"),
        reason: "Espera de un dato de la cohorte de prueba.",
      },
    })
    const mes = await tableroRendimiento(helena.actor, filtros(), bogota("2026-11-18T15:00:00"))
    if (mes.denegado) throw new Error("acceso")
    const fila = mes.filas.find((item) => item.id === valentina.id)
    expect(fila?.completados).toBe(1)
    expect(fila?.dentroSla).toBe(1)
    expect(fila?.fueraSla).toBe(0)
    expect(fila?.horasPromedio).toBeCloseTo(12, 4)

    await caso({
      code: "DES-2002",
      team: "DESARROLLO",
      assigneeId: valentina.id,
      createdAt: bogota("2026-11-10T08:00:00"),
      resolvedAt: new Date("2026-11-16T04:30:00.000Z"),
    })
    await caso({
      code: "DES-2003",
      team: "DESARROLLO",
      assigneeId: valentina.id,
      createdAt: bogota("2026-11-10T08:00:00"),
      resolvedAt: new Date("2026-11-16T05:00:00.000Z"),
    })
    await caso({
      code: "DES-2004",
      team: "DESARROLLO",
      assigneeId: valentina.id,
      status: "EN_DESARROLLO",
      createdAt: new Date("2026-11-23T05:00:00.000Z"),
      resolvedAt: null,
    })
    const semana = await tableroRendimiento(helena.actor, filtros({ periodo: "semana" }), bogota("2026-11-18T15:00:00"))
    if (semana.denegado) throw new Error("acceso")
    expect(semana.filas.find((item) => item.id === valentina.id)?.completados).toBe(1)
    expect(semana.filas.find((item) => item.id === valentina.id)?.asignados).toBe(1)
  })

  it("agrega tareas hechas por semana, mes y año y no mezcla el otro equipo", async () => {
    const { valentina, helena, admin, dual, caso } = await mundo()
    const ahora = bogota("2026-11-18T15:00:00")
    const mkt = await caso({
      code: "MKT-3001",
      team: "MARKETING",
      assigneeId: dual.id,
      createdAt: bogota("2026-11-17T09:00:00"),
      status: "EN_PRODUCCION",
      resolvedAt: null,
    })
    await prisma.tarea.createMany({
      data: [
        { title: "Hecha esta semana", status: "HECHA", assigneeId: valentina.id, createdById: helena.id, createdAt: bogota("2026-11-17T09:00:00"), completedAt: bogota("2026-11-17T11:00:00") },
        { title: "Hecha este mes", status: "HECHA", assigneeId: valentina.id, createdById: helena.id, createdAt: bogota("2026-11-04T09:00:00"), completedAt: bogota("2026-11-04T11:00:00") },
        { title: "Hecha en enero", status: "HECHA", assigneeId: valentina.id, createdById: helena.id, createdAt: bogota("2026-01-20T09:00:00"), completedAt: bogota("2026-01-20T11:00:00") },
        { title: "Sigue pendiente", status: "PENDIENTE", assigneeId: valentina.id, createdById: helena.id, createdAt: bogota("2026-11-17T09:00:00") },
        { title: "Tarea de marketing", status: "HECHA", assigneeId: dual.id, createdById: helena.id, requestId: mkt.id, createdAt: bogota("2026-11-17T09:00:00"), completedAt: bogota("2026-11-17T12:00:00") },
        { title: "Tarea suelta", status: "HECHA", assigneeId: dual.id, createdById: helena.id, createdAt: bogota("2026-11-17T09:00:00"), completedAt: bogota("2026-11-17T13:00:00") },
      ],
    })
    const deHelena = await tableroRendimiento(helena.actor, filtros(), ahora)
    const deAdmin = await tableroRendimiento(admin.actor, filtros(), ahora)
    if (deHelena.denegado || deAdmin.denegado) throw new Error("acceso")
    const fila = deHelena.filas.find((item) => item.id === valentina.id)
    expect(fila?.tareasSemana).toBe(1)
    expect(fila?.tareasMes).toBe(2)
    expect(fila?.tareasAnio).toBe(3)
    expect(fila?.tareasAsignadas).toBe(3)
    expect(fila?.tareasCompletadas).toBe(2)
    expect(fila?.tareasSinHacer).toBe(1)
    expect(deHelena.filas.find((item) => item.id === dual.id)?.tareasSemana).toBe(1)
    expect(deAdmin.filas.find((item) => item.id === dual.id)?.tareasSemana).toBe(2)
  })
})
