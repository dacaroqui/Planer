import "dotenv/config"
import { prisma } from "../src/lib/prisma"

const MARCA = "objetivos-demo"

async function main() {
  const ya = await prisma.objetivo.findFirst({ where: { descripcion: MARCA } })
  if (ya) {
    console.log("Los objetivos de ejemplo ya existen. No se tocaron usuarios ni requerimientos.")
    return
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMINISTRADOR", active: true }, orderBy: { createdAt: "asc" } })
  if (!admin) {
    console.log("Falta un administrador local. No se creó el ejemplo.")
    return
  }
  const objetivo = await prisma.objetivo.create({
    data: {
      marca: "CIFES",
      titulo: "Aumentar la asistencia de ejemplo",
      descripcion: MARCA,
      area: "MARKETING",
      duenoId: admin.id,
      periodoInicio: new Date("2026-11-01T12:00:00.000Z"),
      periodoFin: new Date("2026-12-31T12:00:00.000Z"),
      costoTope: 100,
      estado: "EN_CURSO",
    },
  })
  await prisma.kpi.create({
    data: {
      nombre: "Guion de ejemplo",
      unidad: "piezas",
      lineaBase: 0,
      meta: 1,
      actual: 0,
      fuente: "manual",
      frecuencia: "SEMANAL",
      tipo: "APOYO",
      estadoMeta: "APROBADA",
      bloqueado: true,
      motivoBloqueo: "Falta el guion de ejemplo",
      objetivoId: objetivo.id,
    },
  })
  await prisma.kpi.create({
    data: {
      nombre: "Asistencia de ejemplo",
      unidad: "%",
      lineaBase: 60,
      meta: 75,
      actual: 68,
      fuente: "manual",
      frecuencia: "MENSUAL",
      tipo: "APOYO",
      estadoMeta: "APROBADA",
      objetivoId: objetivo.id,
    },
  })
  await prisma.kpi.create({
    data: {
      nombre: "Piezas del área",
      unidad: "videos",
      lineaBase: 2,
      meta: 8,
      actual: 3,
      fuente: "manual",
      frecuencia: "SEMANAL",
      area: "MARKETING",
      bloqueado: true,
      motivoBloqueo: "Falta el guion",
    },
  })
  const area = await prisma.kpi.findFirst({ where: { nombre: "Piezas del área", area: "MARKETING" } })
  if (area) {
    await prisma.kpiMedicion.createMany({
      data: [
        { kpiId: area.id, valor: 1, nota: "Semana 1", fecha: new Date("2026-11-02T12:00:00.000Z"), registradoPorId: admin.id },
        { kpiId: area.id, valor: 2, nota: "Semana 2", fecha: new Date("2026-11-09T12:00:00.000Z"), registradoPorId: admin.id },
        { kpiId: area.id, valor: 3, nota: "Semana 3", fecha: new Date("2026-11-16T12:00:00.000Z"), registradoPorId: admin.id },
      ],
    })
  }
  const personal = await prisma.kpi.create({
    data: {
      nombre: "Entregas de Participante 1",
      unidad: "piezas",
      lineaBase: 1,
      meta: 4,
      actual: 3,
      fuente: "manual",
      frecuencia: "SEMANAL",
      tipo: "PRINCIPAL",
      estadoMeta: "PROPUESTA",
      personaId: admin.id,
    },
  })
  await prisma.kpiMedicion.createMany({
    data: [
      { kpiId: personal.id, valor: 1, nota: "Semana 1", fecha: new Date("2026-11-02T12:00:00.000Z"), registradoPorId: admin.id },
      { kpiId: personal.id, valor: 2, nota: "Semana 2", fecha: new Date("2026-11-09T12:00:00.000Z"), registradoPorId: admin.id },
      { kpiId: personal.id, valor: 3, nota: "Semana 3", fecha: new Date("2026-11-16T12:00:00.000Z"), registradoPorId: admin.id },
    ],
  })
  await prisma.objetivo.create({
    data: {
      marca: "LUVANIA",
      titulo: "Salida de la pieza de ejemplo",
      descripcion: MARCA,
      area: "DESARROLLO",
      duenoId: admin.id,
      periodoInicio: new Date("2026-11-01T12:00:00.000Z"),
      periodoFin: new Date("2026-12-15T12:00:00.000Z"),
      costoTope: 200,
      estado: "ABIERTO",
    },
  })
  const empresa = await prisma.empresa.findFirst({ where: { active: true }, orderBy: { name: "asc" } })
  let proyecto = await prisma.proyecto.findFirst({ where: { name: "Entregable de ejemplo", description: MARCA } })
  if (!proyecto && empresa) {
    proyecto = await prisma.proyecto.create({
      data: {
        name: "Entregable de ejemplo",
        description: MARCA,
        empresaId: empresa.id,
        leaderId: admin.id,
        team: "MARKETING",
        status: "EN_CURSO",
        startsAt: new Date("2026-11-01T12:00:00.000Z"),
        targetAt: new Date("2026-12-20T12:00:00.000Z"),
      },
    })
    await prisma.tarea.create({
      data: {
        title: "Publicar la pieza de ejemplo",
        projectId: proyecto.id,
        assigneeId: admin.id,
        createdById: admin.id,
        status: "EN_CURSO",
        fechaInicio: new Date("2026-11-03T12:00:00.000Z"),
        dueDate: new Date("2026-11-18T12:00:00.000Z"),
        horasEstimadas: 8,
        costo: 120,
      },
    })
  }
  if (proyecto) {
    await prisma.proyecto.update({ where: { id: proyecto.id }, data: { objetivoId: objetivo.id, fase: "Fase 1", medio: "Redes", costo: 40 } })
    const tarea = await prisma.tarea.findFirst({ where: { projectId: proyecto.id, costo: null } })
    if (tarea) await prisma.tarea.update({ where: { id: tarea.id }, data: { costo: 120 } })
  }
  console.log("Listo. Objetivos de ejemplo, sin tocar requerimientos.")
}

main().catch((error) => { console.error(error); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
