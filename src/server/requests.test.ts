import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { MemoryEmailProvider } from "@/lib/email"
import { DomainError, type Actor, type Membership } from "@/lib/domain"
import { ZONE } from "@/lib/time"
import { asegurarCatalogo } from "@/server/semilla"
import { toActor } from "@/lib/actor"
import {
  adjuntar,
  asignar,
  asignarMasiva,
  cambiarPrioridadMasiva,
  comentar,
  dashboard,
  editarCampos,
  getDetalle,
  deshacerTransicion,
  eliminarEstado,
  listar,
  opcionesTablero,
  opcionesVisibles,
  radicar,
  transicionar,
  transicionarMasiva,
} from "@/server/requests"

let dir = ""

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
  await prisma.empresa.updateMany({ data: { exigirProyectoAlClasificar: false } })
  await prisma.area.deleteMany()
}

beforeEach(async () => {
  await reset()
  await asegurarCatalogo()
  if (!dir) {
    dir = await mkdtemp(path.join(os.tmpdir(), "mesa-uploads-"))
    process.env.UPLOAD_DIR = dir
  }
})

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  await prisma.$disconnect()
})

async function mundo() {
  const area = await prisma.area.create({ data: { name: "Académico" } })
  const clinica = await prisma.area.create({ data: { name: "Clínica Luvania" } })
  const incidencia = await prisma.requestType.findFirstOrThrow({ where: { team: "DESARROLLO", name: "Error (bug)" } })
  const pieza = await prisma.requestType.findFirstOrThrow({ where: { team: "MARKETING", name: "Pieza gráfica" } })
  async function persona(name: string, email: string, areaId: string, memberships: Membership[] = [], admin = false) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
        areaId,
        areaRoles: { create: memberships.map((item) => ({ team: item.team, role: item.role })) },
      },
      include: { areaRoles: true },
    })
    return toActor(user)
  }
  const ana = await persona("Ana Ejemplo", "ana.ejemplo@cifes.edu.co", area.id)
  const julian = await persona("Julián Ejemplo", "julian.ejemplo@cifes.edu.co", clinica.id)
  const valentina = await persona("Valentina Ejemplo", "valentina.ejemplo@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "AGENTE" }])
  const camila = await persona("Camila Ejemplo", "camila.ejemplo@cifes.edu.co", area.id, [{ team: "MARKETING", role: "AGENTE" }])
  const helena = await persona("Helena Ejemplo", "helena.ejemplo@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "LIDER" }])
  const sara = await persona("Sara Ejemplo", "sara.ejemplo@cifes.edu.co", area.id, [{ team: "MARKETING", role: "LIDER" }])
  const gerencia = await persona("Gerencia Ejemplo", "gerencia.ejemplo@cifes.edu.co", area.id, [{ team: "DESARROLLO", role: "OBSERVADOR" }])
  return { area, clinica, incidencia, pieza, ana, julian, valentina, camila, helena, sara, gerencia }
}

const base = {
  justification: "Evita que la cohorte pierda la clase de la semana.",
  declares: true,
  reviewedPersonalData: true,
}

describe("RQ-01 RQ-04 radicar con código de área", () => {
  it("crea DES-0001 en estado Nuevo y avisa al líder", async () => {
    const { incidencia, ana, helena } = await mundo()
    const email = new MemoryEmailProvider()
    const first = await radicar(ana, {
      ...base,
      title: "El aula no abre colorimetría",
      description: "Desde el lunes el módulo de colorimetría muestra una página en blanco al ingresar.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "ALTA",
      brand: "CIFES",
      stepsToReproduce: "Entrar al aula de prueba con el usuario demo y abrir el módulo.",
    }, { email })
    const second = await radicar(ana, {
      ...base,
      title: "Otro error del listado",
      description: "El botón de exportar asistencia no genera el archivo para la cohorte de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir asistencia de la cohorte demo y presionar exportar.",
    }, { email })
    expect(first.code).toBe("DES-0001")
    expect(second.code).toBe("DES-0002")
    expect(first.status).toBe("NUEVO")
    expect(email.messages.some((message) => message.to === helena.email && message.subject.includes("DES-0001"))).toBe(true)
    expect(email.messages.every((message) => !message.text.includes("adjunto binario"))).toBe(true)
  })

  it("rechaza el envío sin la declaración de datos personales", async () => {
    const { incidencia, ana } = await mundo()
    await expect(radicar(ana, {
      ...base,
      declares: false,
      title: "Error de prueba del aula",
      description: "El módulo de colorimetría no carga para la cohorte de demostración.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el módulo con el usuario de prueba.",
    })).rejects.toBeInstanceOf(DomainError)
  })
})

describe("RQ-10 RQ-11 RQ-12 RQ-21 transición, devolución y visibilidad", () => {
  it("respeta el rol, exige datos al aprobar y oculta el caso a otra área", async () => {
    const { incidencia, ana, valentina, camila, helena, gerencia } = await mundo()
    const email = new MemoryEmailProvider()
    const now = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
    const request = await radicar(ana, {
      ...base,
      title: "Reporte de asistencia por cohorte",
      description: "Coordinación necesita bajar la asistencia por cohorte y por módulo de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Entrar a asistencia demo y elegir la cohorte de prueba.",
    }, { email, now })

    expect(await getDetalle(camila, request.code)).toBeNull()
    await expect(transicionar(valentina, request.id, "Iniciar análisis", null, {}, { email, now })).rejects.toBeInstanceOf(DomainError)
    await transicionar(helena, request.id, "Iniciar análisis", null, {}, { email, now })
    await expect(transicionar(helena, request.id, "Aprobar", null, {}, { email, now })).rejects.toBeInstanceOf(DomainError)
    await asignar(helena, request.id, valentina.id, { email, now })
    await editarCampos(helena, request.id, { committedDate: "2026-11-20" }, { email, now })
    await expect(editarCampos(helena, request.id, { priority: "ALTA" }, { email, now })).rejects.toThrow(/administrador/)
    const admin = toActor(await prisma.user.create({
      data: { name: "Admin Clasifica", email: "admin.clasifica@cifes.edu.co", role: "ADMINISTRADOR", areaId: (await prisma.area.findFirstOrThrow()).id },
      include: { areaRoles: true },
    }))
    await editarCampos(admin, request.id, { priority: "ALTA" }, { email, now })
    const cambio = await prisma.activity.findFirst({ where: { requestId: request.id, field: "prioridad" } })
    expect(cambio?.fromValue).toBe("MEDIA")
    expect(cambio?.toValue).toBe("ALTA")
    await transicionar(helena, request.id, "Aprobar", null, {}, { email, now })
    await transicionar(valentina, request.id, "Iniciar desarrollo", null, {}, { email, now })
    await transicionar(valentina, request.id, "Pedir información", "¿Cuál cohorte de prueba debo usar?", {}, { email, now })
    let detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("EN_ESPERA")
    expect(detail?.sla.state).toBe("EN_PAUSA")
    await comentar(ana, request.id, "Use la cohorte demo 2026-1.", false, { email, now })
    detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("EN_DESARROLLO")
    await comentar(valentina, request.id, "Nota **interna** del índice.", true, { email, now })
    expect((await getDetalle(ana, request.code))?.request.comments.some((item) => item.internal)).toBe(false)
    expect((await getDetalle(gerencia, request.code))?.request.comments.some((item) => item.internal)).toBe(false)
    expect((await getDetalle(helena, request.code))?.request.comments.some((item) => item.internal)).toBe(true)
  })
})

describe("RQ-03 RQ-13 adjunto y aprobación de la entrega", () => {
  it("adjunta, entrega con enlace y el solicitante aprueba", async () => {
    const { incidencia, ana, valentina, helena } = await mundo()
    const email = new MemoryEmailProvider()
    const now = DateTime.fromISO("2026-11-09T09:00:00", { zone: ZONE }).toJSDate()
    const request = await radicar(ana, {
      ...base,
      title: "Falla al exportar la cohorte",
      description: "El exportar de asistencia demo no genera el archivo de la cohorte de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "ALTA",
      brand: "CIFES",
      stepsToReproduce: "Abrir asistencia demo y presionar exportar.",
    }, { email, now })
    await adjuntar(ana, request.id, { name: "captura.png", type: "image/png", bytes: Buffer.from("png") })
    await expect(adjuntar(ana, request.id, { name: "virus.exe", type: "application/octet-stream", bytes: Buffer.from("x") })).rejects.toBeInstanceOf(DomainError)
    await transicionar(helena, request.id, "Iniciar análisis", null, {}, { email, now })
    await asignar(helena, request.id, valentina.id, { email, now })
    await editarCampos(helena, request.id, { committedDate: "2026-11-18" }, { email, now })
    await transicionar(helena, request.id, "Aprobar", null, {}, { email, now })
    await transicionar(valentina, request.id, "Iniciar desarrollo", null, {}, { email, now })
    await transicionar(valentina, request.id, "Enviar a pruebas", "Quedó el ajuste en el ambiente de pruebas.", {}, { email, now })
    await transicionar(helena, request.id, "Entregar para validación", "Listo para revisar.", {
      deliveryUrl: "https://ejemplo.cifes.edu.co/pruebas",
    }, { email, now })
    await transicionar(ana, request.id, "Devolver", "Falta el total por módulo.", {}, { email, now })
    let detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("EN_DESARROLLO")
    await transicionar(valentina, request.id, "Enviar a pruebas", "Corregido el total.", {}, { email, now })
    await transicionar(helena, request.id, "Entregar para validación", "Segunda entrega.", {
      deliveryUrl: "https://ejemplo.cifes.edu.co/pruebas",
    }, { email, now })
    await transicionar(ana, request.id, "Aprobar entrega", null, {}, { email, now })
    detail = await getDetalle(ana, request.code)
    expect(detail?.request.status).toBe("CERRADO")
    expect(detail?.request.resolution).toBe("RESUELTO")
  })
})

describe("tablero: transición, entrega y deshacer", () => {
  it("mover un requerimiento no cambia otro", async () => {
    const { incidencia, ana, helena } = await mundo()
    const primero = await radicar(ana, {
      ...base,
      title: "Primer caso del tablero",
      description: "El primero no debe cambiar cuando se mueve el segundo caso de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el primer caso y no tocarlo.",
    })
    const segundo = await radicar(ana, {
      ...base,
      title: "Segundo caso del tablero",
      description: "Este es el caso que sí se mueve de Nuevo a análisis.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el segundo caso y pasarlo a análisis.",
    })
    await transicionar(helena, segundo.id, "Iniciar análisis", null)
    expect((await prisma.request.findUniqueOrThrow({ where: { id: primero.id } })).status).toBe("NUEVO")
    expect((await prisma.request.findUniqueOrThrow({ where: { id: segundo.id } })).status).toBe("EN_ANALISIS")
  })

  it("entregar para validación sin enlace ni adjunto responde el error y no cambia el estado", async () => {
    const { incidencia, ana, helena } = await mundo()
    const request = await radicar(ana, {
      ...base,
      title: "Caso listo para entregar",
      description: "Falta el enlace de la entrega del ambiente de pruebas.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el ambiente de pruebas y no adjuntar nada.",
    })
    await prisma.request.update({ where: { id: request.id }, data: { status: "EN_PRUEBAS", assigneeId: helena.id } })
    await expect(transicionar(helena, request.id, "Entregar para validación", "Listo para revisar.", {})).rejects.toThrow(/enlace o un adjunto/)
    expect((await prisma.request.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("EN_PRUEBAS")
  })

  it("deshace el último movimiento y el líder reabre un cerrado con motivo", async () => {
    const { incidencia, ana, helena, valentina } = await mundo()
    const request = await radicar(ana, {
      ...base,
      title: "Caso para deshacer y reabrir",
      description: "Se mueve a análisis, se deshace y luego se reabre tras cerrarlo.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Pasar a análisis y deshacer ese cambio.",
    })
    await transicionar(helena, request.id, "Iniciar análisis", null)
    await deshacerTransicion(helena, request.id)
    expect((await prisma.request.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("NUEVO")
    const deshecho = await prisma.activity.findFirst({ where: { requestId: request.id, message: "Deshizo el cambio de estado." } })
    expect(deshecho?.fromValue).toBe("EN_ANALISIS")
    expect(deshecho?.toValue).toBe("NUEVO")

    await prisma.request.update({
      where: { id: request.id },
      data: { status: "CERRADO", resolution: "RESUELTO", resolvedAt: new Date(), closedAt: new Date(), assigneeId: valentina.id },
    })
    await expect(transicionar(valentina, request.id, "Reabrir", "No debí cerrarlo.")).rejects.toBeInstanceOf(DomainError)
    await transicionar(helena, request.id, "Reabrir", "Se cerró por error en el tablero.")
    const detail = await getDetalle(helena, request.code)
    expect(detail?.request.status).toBe("EN_ANALISIS")
    expect(detail?.request.activities.some((item) => item.message.includes("Se cerró por error en el tablero."))).toBe(true)
  })

  it("no borra un estado con casos y explica el motivo", async () => {
    const { incidencia, ana, helena } = await mundo()
    const admin = toActor(await prisma.user.create({
      data: { name: "Admin", email: "admin.ejemplo@cifes.edu.co", role: "ADMINISTRADOR", areaId: (await prisma.area.findFirstOrThrow()).id },
      include: { areaRoles: true },
    }))
    await radicar(ana, {
      ...base,
      title: "Caso que ocupa Nuevo",
      description: "Este caso impide borrar el estado Nuevo del flujo de desarrollo.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "BAJA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el aula de prueba y ver el módulo en blanco.",
    })
    const nuevo = await prisma.workflowState.findFirstOrThrow({ where: { team: "DESARROLLO", key: "NUEVO" } })
    await expect(eliminarEstado(admin, nuevo.id)).rejects.toThrow(/tiene \d+ requerimientos/)
    const vacio = await prisma.workflowState.create({
      data: { team: "DESARROLLO", key: "PRUEBA_BORRAR", name: "Prueba borrar", category: "ACTIVO", boardColumn: "Prueba borrar", sortOrder: 900 },
    })
    await eliminarEstado(admin, vacio.id)
    expect(await prisma.workflowState.findUnique({ where: { id: vacio.id } })).toBeNull()
    await expect(eliminarEstado(helena, nuevo.id)).rejects.toThrow(/administrador/)
  })

  it("aprueba si ya hay responsable y fecha, y no lo pide otra vez", async () => {
    const { incidencia, ana, helena, valentina } = await mundo()
    const request = await radicar(ana, {
      ...base,
      title: "Caso ya asignado",
      description: "El responsable y la fecha ya están. Aprobar no debe pedirlos de nuevo.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el aula de prueba y ver el módulo en blanco.",
    })
    await prisma.request.update({
      where: { id: request.id },
      data: { status: "EN_ANALISIS", assigneeId: valentina.id, committedDate: new Date("2026-11-20") },
    })
    await transicionar(helena, request.id, "Aprobar", null)
    expect((await prisma.request.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("APROBADO")
  })
})

void (0 as unknown as Actor)

describe("filtro y columna de área del solicitante", () => {
  it("filtra listar y el dashboard por el área del solicitante y la expone en las opciones", async () => {
    const { area, clinica, incidencia, ana, julian, helena } = await mundo()
    await radicar(ana, {
      ...base,
      title: "Error del aula de colorimetría",
      description: "El módulo de colorimetría no abre para la cohorte de demostración.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el módulo con el usuario de prueba.",
    })
    await radicar(julian, {
      ...base,
      title: "Agenda clínica de prueba no carga",
      description: "La agenda de la sucursal de demostración queda en blanco al abrir el día.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "LUVANIA",
      stepsToReproduce: "Abrir la agenda del día con el usuario de prueba.",
    })
    const academico = await listar(helena, { areaId: area.id })
    expect(academico.items).toHaveLength(1)
    expect(academico.items[0].area?.name).toBe("Académico")
    expect(academico.items[0].requester.name).toBe("Ana Ejemplo")
    const clinicaLista = await listar(helena, { areaId: clinica.id })
    expect(clinicaLista.items.map((item) => item.requester.name)).toEqual(["Julián Ejemplo"])
    const opciones = await opcionesVisibles(helena)
    expect(opciones.areas.map((item) => item.name).sort()).toEqual(["Académico", "Clínica Luvania"])
    const tablero = await opcionesTablero(helena, "DESARROLLO")
    expect(tablero.areas.some((item) => item.name === "Académico")).toBe(true)
    const panel = await dashboard(helena, { areaId: area.id })
    expect(panel.abiertos).toBe(1)
  })
})

describe("acciones masivas sobre la selección", () => {
  it("cambia la prioridad de varios y respeta el permiso de líder", async () => {
    const { incidencia, ana, valentina, helena } = await mundo()
    const uno = await radicar(ana, {
      ...base,
      title: "Falla al entrar al aula de prueba",
      description: "El aula demo no carga el módulo de colorimetría para la cohorte.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Entrar al aula con el usuario de prueba.",
    })
    const dos = await radicar(ana, {
      ...base,
      title: "Exportar asistencia no descarga",
      description: "El botón de exportar de la cohorte demo no genera el archivo.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir asistencia demo y pulsar exportar.",
    })
    await expect(cambiarPrioridadMasiva(valentina, [uno.code, dos.code], "ALTA")).rejects.toBeInstanceOf(DomainError)
    await expect(cambiarPrioridadMasiva(helena, [uno.code, dos.code], "ALTA")).rejects.toThrow(/administrador/)
    const admin = toActor(await prisma.user.create({
      data: { name: "Admin Prioridad", email: "admin.prioridad@cifes.edu.co", role: "ADMINISTRADOR", areaId: (await prisma.area.findFirstOrThrow()).id },
      include: { areaRoles: true },
    }))
    const total = await cambiarPrioridadMasiva(admin, [uno.code, dos.code], "ALTA")
    expect(total).toBe(2)
    const lista = await listar(helena, {})
    expect(lista.items.every((item) => item.priority === "ALTA")).toBe(true)
  })

  it("transiciona y asigna en lote conservando los permisos individuales", async () => {
    const { incidencia, ana, valentina, helena } = await mundo()
    const uno = await radicar(ana, {
      ...base,
      title: "Listado de cohortes incompleto",
      description: "Falta la cohorte de demostración en el listado del aula de prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el listado de cohortes con el usuario demo.",
    })
    const dos = await radicar(ana, {
      ...base,
      title: "Botón de guardar no responde",
      description: "En el formulario de prueba el botón guardar no confirma el cambio.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Editar un dato y pulsar guardar.",
    })
    const transicionAgente = await transicionarMasiva(valentina, [uno.code, dos.code], "EN_ANALISIS")
    expect(transicionAgente).toBe(0)
    const transicionLider = await transicionarMasiva(helena, [uno.code, dos.code], "EN_ANALISIS")
    expect(transicionLider).toBe(2)
    expect((await prisma.request.findUniqueOrThrow({ where: { id: uno.id } })).status).toBe("EN_ANALISIS")
    const asignaSolicitante = await asignarMasiva(ana, [uno.code, dos.code], valentina.id)
    expect(asignaSolicitante.hechos).toBe(0)
    expect(asignaSolicitante.errores).toHaveLength(2)
    const asignados = await asignarMasiva(helena, [uno.code, dos.code], valentina.id)
    expect(asignados.hechos).toBe(2)
    expect(asignados.errores).toEqual([])
    expect((await prisma.request.findUniqueOrThrow({ where: { id: dos.id } })).assigneeId).toBe(valentina.id)
  })

  it("el administrador asigna a otro equipo y el líder ve el motivo por requerimiento", async () => {
    const { area, incidencia, ana, camila, helena } = await mundo()
    const adminUser = await prisma.user.create({
      data: { name: "Admin Asigna", email: "admin.asigna@cifes.edu.co", role: "ADMINISTRADOR", areaId: area.id },
      include: { areaRoles: true },
    })
    const admin = toActor(adminUser)
    const desarrollo = await radicar(ana, {
      ...base,
      title: "Caso de desarrollo para otro equipo",
      description: "El administrador quiere dejarlo en manos de marketing para la prueba.",
      team: "DESARROLLO",
      typeId: incidencia.id,
      priority: "MEDIA",
      brand: "CIFES",
      stepsToReproduce: "Abrir el caso de prueba y revisar el módulo.",
    })
    const delLider = await asignarMasiva(helena, [desarrollo.code], camila.id)
    expect(delLider.hechos).toBe(0)
    expect(delLider.errores).toEqual([
      { code: desarrollo.code, mensaje: "Camila Ejemplo no es agente ni líder de Desarrollo." },
    ])
    const delAdmin = await asignarMasiva(admin, [desarrollo.code], camila.id)
    expect(delAdmin).toEqual({ hechos: 1, errores: [] })
    expect((await prisma.request.findUniqueOrThrow({ where: { id: desarrollo.id } })).assigneeId).toBe(camila.id)
  })
})
