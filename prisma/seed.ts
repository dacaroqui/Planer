import { PrismaClient } from "@prisma/client"
import { esSemillaDemo } from "../src/lib/semilla-modo"
import { asegurarCatalogo } from "../src/server/semilla"
import { toActor } from "../src/lib/actor"
import { radicar, transicionar, asignar, editarCampos } from "../src/server/requests"
import { MemoryEmailProvider } from "../src/lib/email"

export const prisma = new PrismaClient()

async function limpiar() {
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
  await prisma.area.deleteMany()
}

export async function sembrar() {
  if (!esSemillaDemo({ SEED_DEMO: process.env.SEED_DEMO })) {
    await asegurarCatalogo(prisma)
    const { asegurarAdminInicial } = await import("../src/server/admin-inicial")
    await asegurarAdminInicial()
    console.log("Catálogo listo. SEED_DEMO no está activo: no se cargan datos de demostración.")
    return
  }
  await limpiar()
  await asegurarCatalogo(prisma)
  const nombres = ["Académico", "Admisiones", "Clínica Luvania", "Tecnología", "Mercadeo", "Dirección"]
  const areas = Object.fromEntries(await Promise.all(nombres.map(async (name) => {
    const area = await prisma.area.create({ data: { name } })
    return [name, area] as const
  })))
  async function persona(name: string, email: string, area: string, memberships: { team: "DESARROLLO" | "MARKETING"; role: "AGENTE" | "LIDER" | "OBSERVADOR" }[] = [], admin = false) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: admin ? "ADMINISTRADOR" : "SOLICITANTE",
        areaId: areas[area].id,
        areaRoles: { create: memberships },
      },
      include: { areaRoles: true },
    })
    return toActor(user)
  }
  const ana = await persona("Ana Ejemplo", "ana.ejemplo@cifes.edu.co", "Académico")
  const julian = await persona("Julián Ejemplo", "julian.ejemplo@cifes.edu.co", "Clínica Luvania")
  const valentina = await persona("Valentina Ejemplo", "valentina.ejemplo@cifes.edu.co", "Tecnología", [{ team: "DESARROLLO", role: "AGENTE" }])
  await persona("Mateo Ejemplo", "mateo.ejemplo@cifes.edu.co", "Tecnología", [{ team: "DESARROLLO", role: "AGENTE" }])
  const camila = await persona("Camila Ejemplo", "camila.ejemplo@cifes.edu.co", "Mercadeo", [{ team: "MARKETING", role: "AGENTE" }])
  await persona("Tomás Ejemplo", "tomas.ejemplo@cifes.edu.co", "Mercadeo", [{ team: "MARKETING", role: "AGENTE" }])
  const helena = await persona("Helena Ejemplo", "helena.ejemplo@cifes.edu.co", "Tecnología", [{ team: "DESARROLLO", role: "LIDER" }])
  const sara = await persona("Sara Ejemplo", "sara.ejemplo@cifes.edu.co", "Mercadeo", [{ team: "MARKETING", role: "LIDER" }])
  await persona("Admin Ejemplo", "admin.ejemplo@cifes.edu.co", "Dirección", [], true)
  await persona("Gerencia Ejemplo", "gerencia.ejemplo@cifes.edu.co", "Dirección", [
    { team: "DESARROLLO", role: "OBSERVADOR" },
    { team: "MARKETING", role: "OBSERVADOR" },
  ])
  const error = await prisma.requestType.findFirstOrThrow({ where: { name: "Error (bug)" } })
  const pieza = await prisma.requestType.findFirstOrThrow({ where: { name: "Pieza gráfica" } })
  const email = new MemoryEmailProvider()
  const aula = await radicar(ana, {
    title: "El aula virtual no abre colorimetría",
    description: "Desde el lunes los estudiantes de prueba ven una página en blanco en el módulo de colorimetría.",
    team: "DESARROLLO",
    typeId: error.id,
    priority: "ALTA",
    brand: "CIFES",
    justification: "La cohorte de demostración no puede avanzar la clase.",
    stepsToReproduce: "Entrar con el usuario demo y abrir el módulo de colorimetría.",
    declares: true,
  }, { email })
  await transicionar(helena, aula.id, "Iniciar análisis", null, {}, { email })
  await asignar(helena, aula.id, valentina.id, { email })
  await editarCampos(helena, aula.id, { committedDate: "2026-11-20" }, { email })
  await transicionar(helena, aula.id, "Aprobar", null, {}, { email })
  await transicionar(valentina, aula.id, "Iniciar desarrollo", null, {}, { email })
  const piezaReq = await radicar(julian, {
    title: "Pieza para el protocolo de labios",
    description: "La clínica necesita una pieza cuadrada del protocolo, sin fotos de pacientes.",
    team: "MARKETING",
    typeId: pieza.id,
    priority: "ALTA",
    brand: "LUVANIA",
    justification: "La pauta de la semana no tiene pieza aprobada.",
    channels: "Instagram",
    declares: true,
  }, { email })
  await transicionar(sara, piezaReq.id, "Revisar brief", null, {}, { email })
  await asignar(sara, piezaReq.id, camila.id, { email })
  await editarCampos(sara, piezaReq.id, { committedDate: "2026-11-21" }, { email })

  const cifes = await prisma.empresa.findUniqueOrThrow({ where: { name: "CIFES" } })
  const luvania = await prisma.empresa.findUniqueOrThrow({ where: { name: "Luvania" } })
  const tipos = await prisma.requestType.findMany()
  const tipo = (team: "DESARROLLO" | "MARKETING", name: string) => tipos.find((item) => item.team === team && item.name === name)!
  const aulaVirtual = await prisma.proyecto.create({
    data: { empresaId: cifes.id, name: "Aula virtual 2026-1", description: "Estabilizar el aula de la cohorte de demostración.", leaderId: helena.id, startsAt: new Date("2026-10-01"), targetAt: new Date("2026-12-15"), status: "EN_CURSO" },
  })
  const matriculas = await prisma.proyecto.create({
    data: { empresaId: cifes.id, name: "Matrículas en línea", description: "Cerrar el flujo de matrícula de prueba.", leaderId: helena.id, startsAt: new Date("2026-08-01"), targetAt: new Date("2026-11-30"), status: "EN_CURSO" },
  })
  const reportes = await prisma.proyecto.create({
    data: { empresaId: cifes.id, name: "Reportes académicos", description: "Informes para coordinación, sin tareas todavía.", leaderId: helena.id, startsAt: new Date("2026-09-01"), targetAt: new Date("2026-12-01"), status: "PLANIFICADO" },
  })
  const campana = await prisma.proyecto.create({
    data: { empresaId: luvania.id, name: "Campaña de noviembre", description: "Piezas de la clínica para la segunda quincena.", leaderId: sara.id, startsAt: new Date("2026-11-01"), targetAt: new Date("2026-11-30"), status: "EN_CURSO" },
  })
  const protocolo = await prisma.proyecto.create({
    data: { empresaId: luvania.id, name: "Protocolo de labios", description: "Pieza y textos del protocolo, sin pacientes reales.", leaderId: sara.id, startsAt: new Date("2026-10-15"), targetAt: new Date("2026-12-10"), status: "EN_CURSO" },
  })
  await prisma.request.update({ where: { id: aula.id }, data: { empresaId: cifes.id, projectId: aulaVirtual.id } })
  await prisma.request.update({ where: { id: piezaReq.id }, data: { empresaId: luvania.id, projectId: protocolo.id } })

  const julianUser = await prisma.user.findUniqueOrThrow({ where: { email: julian.email } })
  const anaUser = await prisma.user.findUniqueOrThrow({ where: { email: ana.email } })
  const valentinaUser = await prisma.user.findUniqueOrThrow({ where: { email: valentina.email } })
  const camilaUser = await prisma.user.findUniqueOrThrow({ where: { email: camila.email } })
  const ahora = new Date("2026-11-10T14:00:00.000Z")
  const filas: Array<{ code: string; title: string; team: "DESARROLLO" | "MARKETING"; status: string; empresaId: string; projectId: string | null; type: string; priority: string; brand: string; requesterId: string; assigneeId?: string; resolution?: string }> = [
    { code: "DES-0002", title: "El exportar de asistencia demo falla", team: "DESARROLLO", status: "EN_PRUEBAS", empresaId: cifes.id, projectId: aulaVirtual.id, type: "Error (bug)", priority: "ALTA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
    { code: "DES-0003", title: "Acceso de la coordinadora de prueba", team: "DESARROLLO", status: "NUEVO", empresaId: cifes.id, projectId: matriculas.id, type: "Soporte o acceso", priority: "MEDIA", brand: "CIFES", requesterId: anaUser.id },
    { code: "DES-0004", title: "Reporte de asistencia por cohorte demo", team: "DESARROLLO", status: "EN_ANALISIS", empresaId: cifes.id, projectId: reportes.id, type: "Datos o reporte", priority: "MEDIA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
    { code: "DES-0005", title: "Ajuste del texto del aula", team: "DESARROLLO", status: "CERRADO", empresaId: cifes.id, projectId: matriculas.id, type: "Mejora/ajuste", priority: "BAJA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id, resolution: "RESUELTO" },
    { code: "DES-0006", title: "Nueva vista de notas de la cohorte", team: "DESARROLLO", status: "APROBADO", empresaId: cifes.id, projectId: aulaVirtual.id, type: "Nueva funcionalidad", priority: "ALTA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
    { code: "DES-0007", title: "Error al guardar el borrador de matrícula", team: "DESARROLLO", status: "EN_DESARROLLO", empresaId: cifes.id, projectId: matriculas.id, type: "Error (bug)", priority: "CRITICA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
    { code: "DES-0008", title: "Informe de deserción de la cohorte demo", team: "DESARROLLO", status: "EN_ESPERA", empresaId: cifes.id, projectId: reportes.id, type: "Datos o reporte", priority: "MEDIA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
    { code: "DES-0009", title: "Permiso de solo lectura para gerencia", team: "DESARROLLO", status: "RECHAZADO", empresaId: cifes.id, projectId: null, type: "Soporte o acceso", priority: "BAJA", brand: "CIFES", requesterId: anaUser.id, resolution: "NO_SE_HARA" },
    { code: "DES-0010", title: "Mejora del buscador de módulos", team: "DESARROLLO", status: "EN_VALIDACION", empresaId: cifes.id, projectId: aulaVirtual.id, type: "Mejora/ajuste", priority: "MEDIA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
    { code: "DES-0011", title: "Carga masiva de la cohorte de prueba", team: "DESARROLLO", status: "CERRADO", empresaId: cifes.id, projectId: matriculas.id, type: "Nueva funcionalidad", priority: "ALTA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id, resolution: "RESUELTO" },
    { code: "MKT-0002", title: "Historia para redes de la clínica", team: "MARKETING", status: "EN_PRODUCCION", empresaId: luvania.id, projectId: campana.id, type: "Publicación en redes", priority: "ALTA", brand: "LUVANIA", requesterId: julianUser.id, assigneeId: camilaUser.id },
    { code: "MKT-0003", title: "Video corto del protocolo", team: "MARKETING", status: "EN_REVISION_INTERNA", empresaId: luvania.id, projectId: protocolo.id, type: "Video/audiovisual", priority: "MEDIA", brand: "LUVANIA", requesterId: julianUser.id, assigneeId: camilaUser.id },
    { code: "MKT-0004", title: "Landing de valoración de noviembre", team: "MARKETING", status: "NUEVO", empresaId: luvania.id, projectId: campana.id, type: "Contenido web/landing", priority: "ALTA", brand: "LUVANIA", requesterId: julianUser.id },
    { code: "MKT-0005", title: "Pauta de la semana de labios", team: "MARKETING", status: "EN_APROBACION", empresaId: luvania.id, projectId: protocolo.id, type: "Campaña o pauta", priority: "ALTA", brand: "LUVANIA", requesterId: julianUser.id, assigneeId: camilaUser.id },
    { code: "MKT-0006", title: "Pieza de bienvenida CIFES", team: "MARKETING", status: "PROGRAMADO", empresaId: cifes.id, projectId: matriculas.id, type: "Pieza gráfica", priority: "MEDIA", brand: "CIFES", requesterId: anaUser.id, assigneeId: camilaUser.id },
    { code: "MKT-0007", title: "Activación en la sede de prueba", team: "MARKETING", status: "CANCELADO", empresaId: luvania.id, projectId: campana.id, type: "Evento o activación", priority: "BAJA", brand: "LUVANIA", requesterId: julianUser.id, resolution: "CANCELADO_SOLICITANTE" },
    { code: "MKT-0008", title: "Carrusel de tratamientos sin pacientes", team: "MARKETING", status: "EN_REVISION_BRIEF", empresaId: luvania.id, projectId: campana.id, type: "Publicación en redes", priority: "MEDIA", brand: "LUVANIA", requesterId: julianUser.id },
    { code: "DES-0012", title: "Tablero de la cohorte para coordinación", team: "DESARROLLO", status: "EN_DESARROLLO", empresaId: cifes.id, projectId: reportes.id, type: "Nueva funcionalidad", priority: "MEDIA", brand: "CIFES", requesterId: anaUser.id, assigneeId: valentinaUser.id },
  ]
  for (const fila of filas) {
    await prisma.request.create({
      data: {
        code: fila.code,
        title: fila.title,
        description: `${fila.title}. Caso de demostración con datos ficticios, sin personas reales.`,
        brand: fila.brand,
        empresaId: fila.empresaId,
        projectId: fila.projectId,
        priority: fila.priority,
        prioritySuggested: fila.priority,
        team: fila.team,
        status: fila.status,
        typeId: tipo(fila.team, fila.type).id,
        areaId: fila.requesterId === anaUser.id ? areas["Académico"].id : areas["Clínica Luvania"].id,
        requesterId: fila.requesterId,
        assigneeId: fila.assigneeId,
        resolution: fila.resolution,
        resolvedAt: fila.resolution ? ahora : null,
        closedAt: fila.status === "CERRADO" || fila.status === "CANCELADO" || fila.status === "RECHAZADO" ? ahora : null,
        declaresNoPersonalData: true,
        slaStartedAt: ahora,
        slaTargetMinutes: 1440,
        firstResponseMinutes: 240,
        resolutionMinutes: 1440,
        createdAt: ahora,
        updatedAt: ahora,
      },
    })
  }
  await prisma.codeSequence.upsert({ where: { prefix: "DES" }, update: { last: 12 }, create: { prefix: "DES", last: 12 } })
  await prisma.codeSequence.upsert({ where: { prefix: "MKT" }, update: { last: 8 }, create: { prefix: "MKT", last: 8 } })

  const reqAula = await prisma.request.findUniqueOrThrow({ where: { code: "DES-0001" } })
  const tareaIndice = await prisma.tarea.create({
    data: { title: "Revisar el índice del módulo", status: "EN_CURSO", assigneeId: valentinaUser.id, dueDate: new Date("2026-11-18"), requestId: reqAula.id, projectId: aulaVirtual.id, createdById: helena.id },
  })
  await prisma.tarea.create({ data: { title: "Comparar con el módulo de prueba", status: "HECHA", parentId: tareaIndice.id, requestId: reqAula.id, projectId: aulaVirtual.id, createdById: valentinaUser.id, completedAt: ahora } })
  await prisma.tarea.create({ data: { title: "Anotar el recurso que no carga", status: "PENDIENTE", parentId: tareaIndice.id, assigneeId: valentinaUser.id, dueDate: new Date("2026-11-12"), requestId: reqAula.id, projectId: aulaVirtual.id, createdById: valentinaUser.id } })
  await prisma.tarea.create({
    data: { title: "Publicar el parche en el ambiente demo", status: "PENDIENTE", assigneeId: valentinaUser.id, dueDate: new Date("2026-11-22"), requestId: reqAula.id, projectId: aulaVirtual.id, createdById: helena.id },
  })
  const reqExport = await prisma.request.findUniqueOrThrow({ where: { code: "DES-0002" } })
  await prisma.tarea.create({ data: { title: "Reproducir el exportar con la cohorte demo", status: "HECHA", assigneeId: valentinaUser.id, requestId: reqExport.id, projectId: aulaVirtual.id, createdById: valentinaUser.id, completedAt: ahora } })
  await prisma.tarea.create({ data: { title: "Dejar el archivo de ejemplo en el ambiente", status: "EN_CURSO", assigneeId: valentinaUser.id, dueDate: new Date("2026-11-16"), requestId: reqExport.id, projectId: aulaVirtual.id, createdById: helena.id } })
  const reqHistoria = await prisma.request.findUniqueOrThrow({ where: { code: "MKT-0002" } })
  const piezaTarea = await prisma.tarea.create({ data: { title: "Armar la historia cuadrada", status: "EN_CURSO", assigneeId: camilaUser.id, dueDate: new Date("2026-11-20"), requestId: reqHistoria.id, projectId: campana.id, createdById: sara.id } })
  await prisma.tarea.create({ data: { title: "Elegir la paleta de Luvania", status: "HECHA", parentId: piezaTarea.id, projectId: campana.id, requestId: reqHistoria.id, createdById: camilaUser.id, completedAt: ahora } })
  await prisma.tarea.create({ data: { title: "Escribir el texto sin datos de pacientes", status: "PENDIENTE", parentId: piezaTarea.id, assigneeId: camilaUser.id, dueDate: new Date("2026-11-08"), projectId: campana.id, requestId: reqHistoria.id, createdById: sara.id } })
  const reqPieza = await prisma.request.findUniqueOrThrow({ where: { code: "MKT-0001" } })
  await prisma.tarea.create({ data: { title: "Dejar lista la pieza del protocolo", status: "HECHA", assigneeId: camilaUser.id, requestId: reqPieza.id, projectId: protocolo.id, createdById: sara.id, completedAt: ahora } })
  await prisma.comment.create({ data: { requestId: reqAula.id, authorId: valentinaUser.id, body: "El fallo está en un recurso de video del módulo de **prueba**.", internal: false } })
  await prisma.comment.create({ data: { requestId: reqAula.id, authorId: anaUser.id, body: "Confirmo que pasa solo en la cohorte demo.", internal: false } })
  await prisma.comment.create({ data: { requestId: reqHistoria.id, authorId: camilaUser.id, body: "La primera versión usa solo ilustración, sin fotografías.", internal: false } })
  console.log("Semilla demo lista. Usuarios @cifes.edu.co, sin contraseña.")
}

const entrada = process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")
if (entrada) {
  sembrar().catch((error) => {
    console.error(error)
    process.exit(1)
  }).finally(async () => {
    await prisma.$disconnect()
  })
}
