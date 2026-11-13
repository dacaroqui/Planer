import { DateTime } from "luxon"
import { PrismaClient, type Team, type Role } from "@prisma/client"
import { MemoryEmailProvider } from "../src/lib/email"
import type { Actor } from "../src/lib/domain"
import { ZONE } from "../src/lib/time"
import { asignar, comentar, radicar, transicionar } from "../src/server/requests"

const prisma = new PrismaClient()
const email = new MemoryEmailProvider()

function en(iso: string) {
  return DateTime.fromISO(iso, { zone: ZONE }).toJSDate()
}

async function limpiar() {
  await prisma.notification.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.slaPause.deleteMany()
  await prisma.request.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.user.deleteMany()
  await prisma.requestType.deleteMany()
  await prisma.area.deleteMany()
}

async function main() {
  await limpiar()
  const areas = await Promise.all([
    "Académico",
    "Admisiones",
    "Experiencia del estudiante",
    "Clínica Luvania",
    "Finanzas",
    "Talento humano",
    "Tecnología",
    "Mercadeo",
    "Dirección",
  ].map((name) => prisma.area.create({ data: { name } })))
  const area = Object.fromEntries(areas.map((item) => [item.name, item]))

  const tipos = [
    ["DESARROLLO", "Incidencia en plataforma", "Algo que ya funcionaba dejó de servir.", 8, false],
    ["DESARROLLO", "Acceso o permiso", "Alta, baja o cambio de acceso a un sistema interno.", 4, false],
    ["DESARROLLO", "Nueva funcionalidad", "Una capacidad que la plataforma todavía no tiene.", 40, true],
    ["DESARROLLO", "Reporte o integración", "Un informe o una conexión con otro sistema.", 24, true],
    ["DESARROLLO", "Ajuste de contenido web", "Cambio de texto o de una página existente.", 16, false],
    ["MARKETING", "Pieza gráfica", "Una imagen o pieza para una publicación.", 16, false],
    ["MARKETING", "Campaña", "Una campaña con varias piezas y un calendario.", 40, true],
    ["MARKETING", "Contenido para redes", "Un texto o una secuencia corta para redes.", 8, false],
    ["MARKETING", "Landing o pauta", "Una página de captura o el ajuste de una pauta.", 24, true],
    ["MARKETING", "Fotografía o video", "Una producción de foto o video.", 24, false],
  ] as const
  const typeByName = new Map<string, { id: string }>()
  for (const [team, name, description, hours, requiresApproval] of tipos) {
    const created = await prisma.requestType.create({
      data: { team, name, description, slaMinutes: hours * 60, requiresApproval },
    })
    typeByName.set(name, created)
  }

  const personas: Array<[string, string, Role, Team | null, string]> = [
    ["Ana Ejemplo", "ana.ejemplo@cifes.edu.co", "SOLICITANTE", null, "Académico"],
    ["Julián Ejemplo", "julian.ejemplo@cifes.edu.co", "SOLICITANTE", null, "Clínica Luvania"],
    ["Valentina Ejemplo", "valentina.ejemplo@cifes.edu.co", "AGENTE", "DESARROLLO", "Tecnología"],
    ["Mateo Ejemplo", "mateo.ejemplo@cifes.edu.co", "AGENTE", "DESARROLLO", "Tecnología"],
    ["Camila Ejemplo", "camila.ejemplo@cifes.edu.co", "AGENTE", "MARKETING", "Mercadeo"],
    ["Tomás Ejemplo", "tomas.ejemplo@cifes.edu.co", "AGENTE", "MARKETING", "Mercadeo"],
    ["Helena Ejemplo", "helena.ejemplo@cifes.edu.co", "LIDER", "DESARROLLO", "Tecnología"],
    ["Sara Ejemplo", "sara.ejemplo@cifes.edu.co", "LIDER", "MARKETING", "Mercadeo"],
    ["Admin Ejemplo", "admin.ejemplo@cifes.edu.co", "ADMINISTRADOR", null, "Dirección"],
    ["Gerencia Ejemplo", "gerencia.ejemplo@cifes.edu.co", "OBSERVADOR", null, "Dirección"],
  ]
  const users = new Map<string, Actor>()
  for (const [name, mail, role, team, areaName] of personas) {
    const user = await prisma.user.create({
      data: { name, email: mail, role, team, areaId: area[areaName].id },
    })
    users.set(name, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      team: user.team,
      areaId: user.areaId,
      active: true,
    })
  }
  const ana = users.get("Ana Ejemplo")!
  const julian = users.get("Julián Ejemplo")!
  const valentina = users.get("Valentina Ejemplo")!
  const camila = users.get("Camila Ejemplo")!
  const helena = users.get("Helena Ejemplo")!
  const sara = users.get("Sara Ejemplo")!

  const aula = await radicar(ana, {
    title: "El aula virtual no abre el módulo de colorimetría",
    description: "Desde el lunes los estudiantes del módulo de colorimetría ven una página en blanco al entrar. El resto de módulos sí carga.",
    expectedResult: "Que el módulo vuelva a abrir para la cohorte activa, sin perder el avance.",
    team: "DESARROLLO",
    typeId: typeByName.get("Incidencia en plataforma")!.id,
    priority: "ALTA",
    brand: "CIFES",
  }, { email, now: en("2026-11-12T09:10:00") })
  await transicionar(valentina, aula.id, "EN_ANALISIS", null, { email, now: en("2026-11-12T09:40:00") })
  await transicionar(valentina, aula.id, "EN_DESARROLLO", null, { email, now: en("2026-11-12T11:15:00") })
  await asignar(helena, aula.id, valentina.id, { email, now: en("2026-11-12T11:20:00") })
  await comentar(valentina, aula.id, "El fallo está en el recurso de video, no en la matrícula. Sigo con el ajuste.", false, { email, now: en("2026-11-12T15:00:00") })
  await comentar(valentina, aula.id, "Revisar el índice de contenidos antes de publicar el parche.", true, { email, now: en("2026-11-12T15:10:00") })

  const reporte = await radicar(ana, {
    title: "Reporte de asistencia por cohorte",
    description: "Coordinación académica necesita bajar la asistencia por cohorte y por módulo, no solo por estudiante.",
    expectedResult: "Un archivo CSV con estudiante, módulo y porcentaje de asistencia.",
    team: "DESARROLLO",
    typeId: typeByName.get("Nueva funcionalidad")!.id,
    priority: "MEDIA",
    brand: "CIFES",
  }, { email, now: en("2026-11-10T08:30:00") })
  await transicionar(valentina, reporte.id, "EN_ANALISIS", null, { email, now: en("2026-11-10T10:00:00") })
  await transicionar(valentina, reporte.id, "PENDIENTE_APROBACION", null, { email, now: en("2026-11-10T10:20:00") })

  const pieza = await radicar(julian, {
    title: "Pieza para el protocolo de labios de Luvania",
    description: "La clínica necesita una pieza cuadrada que explique el protocolo de labios, con el tono de la marca y sin antes y después de pacientes reales.",
    expectedResult: "Una imagen lista para publicar, con el logo de Luvania y el texto aprobado por la dirección médica.",
    team: "MARKETING",
    typeId: typeByName.get("Pieza gráfica")!.id,
    priority: "ALTA",
    brand: "LUVANIA",
  }, { email, now: en("2026-11-11T14:00:00") })
  await transicionar(camila, pieza.id, "EN_REVISION", null, { email, now: en("2026-11-11T15:10:00") })
  await transicionar(camila, pieza.id, "EN_PRODUCCION", null, { email, now: en("2026-11-11T16:00:00") })
  await asignar(sara, pieza.id, camila.id, { email, now: en("2026-11-11T16:05:00") })

  const campana = await radicar(julian, {
    title: "Campaña de valoración de noviembre",
    description: "Queremos una campaña corta para llenar la agenda de valoración de la segunda quincena. Hace falta definir el beneficio y las sedes.",
    expectedResult: "Calendario de piezas y textos listos para la pauta de la clínica.",
    team: "MARKETING",
    typeId: typeByName.get("Campaña")!.id,
    priority: "ALTA",
    brand: "LUVANIA",
  }, { email, now: en("2026-11-09T09:00:00") })
  await transicionar(camila, campana.id, "EN_REVISION", null, { email, now: en("2026-11-09T10:00:00") })
  await transicionar(camila, campana.id, "PENDIENTE_BRIEF", "Necesitamos el beneficio, las sedes y si hay restricción de pauta médica.", {
    email,
    now: en("2026-11-09T11:00:00"),
  })

  const acceso = await radicar(ana, {
    title: "Acceso al campus para la nueva coordinadora",
    description: "La coordinadora de admisiones no puede entrar al campus. El correo institucional ya existe.",
    expectedResult: "Que pueda ingresar al campus y ver solo los módulos de admisiones.",
    team: "DESARROLLO",
    typeId: typeByName.get("Acceso o permiso")!.id,
    priority: "MEDIA",
    brand: "CIFES",
  }, { email, now: en("2026-10-20T08:30:00") })
  await transicionar(valentina, acceso.id, "EN_ANALISIS", null, { email, now: en("2026-10-20T09:00:00") })

  console.log(`Semilla lista. Avisos de ejemplo en memoria: ${email.messages.length}.`)
  console.log("Usuarios de prueba: ana.ejemplo, julian.ejemplo, valentina.ejemplo, helena.ejemplo, camila.ejemplo, sara.ejemplo, admin.ejemplo, gerencia.ejemplo @cifes.edu.co")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
