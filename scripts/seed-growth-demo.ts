import "dotenv/config"
import { prisma } from "../src/lib/prisma"

const CICLO = "Ciclo 01"

async function main() {
  const ya = await prisma.growthCiclo.findFirst({ where: { nombre: CICLO, ilustrativo: true } })
  if (ya) {
    await asegurarAprendizaje()
    await asegurarPeriodoPrevio()
    console.log("El Ciclo 01 de ejemplo ya existe. Se revisó el aprendizaje y el periodo anterior de ejemplo, sin tocar usuarios ni requerimientos.")
    return
  }
  const ciclo = await prisma.growthCiclo.create({
    data: {
      nombre: CICLO,
      brand: "LUVANIA",
      ilustrativo: true,
      activo: true,
      reunion: "lectura de propuestas y aportes del equipo.",
    },
  })
  const embudo = await prisma.growthEmbudo.create({
    data: { cicloId: ciclo.id, brand: "LUVANIA", fuente: "MANUAL" },
  })
  await prisma.growthEtapa.createMany({
    data: [
      { embudoId: embudo.id, nombre: "Consultas", valor: 400, orden: 1, valorPrevio: 380 },
      { embudoId: embudo.id, nombre: "Valoraciones agendadas", valor: 160, orden: 2, valorPrevio: 150 },
      { embudoId: embudo.id, nombre: "Asistencias", valor: 96, orden: 3, destacado: true, llamada: "60% de asistencia", subllamada: "Oportunidad de mejora", valorPrevio: 88 },
      { embudoId: embudo.id, nombre: "Compras", valor: 38, orden: 4, valorPrevio: 34 },
      { embudoId: embudo.id, nombre: "Recompras", valor: 12, orden: 5, valorPrevio: 10 },
    ],
  })
  await prisma.growthExperimento.createMany({
    data: [
      {
        cicloId: ciclo.id,
        nombre: "Facilitar la reprogramación",
        brand: "LUVANIA",
        ownerName: "Participante 1",
        etapaEmbudo: "Asistencia",
        estado: "EN_EJECUCION",
        metrica: "tasa de asistencia",
        problema: "Las citas se pierden cuando el horario no le sirve a la persona.",
        donde: "Agenda de valoraciones",
        datos: "De 160 valoraciones agendadas, 96 asisten.",
        explicacion: "No hay una forma clara de mover la cita.",
        referencia: "Reprogramación en un clic.",
        mecanismo: "Ofrecer otro horario el mismo día.",
        porque: "Recupera asistencias sin abrir más agenda.",
        valorInicial: "60",
        meta: "75",
        comparacion: "Ciclo anterior",
        duracion: "14 días",
        proximaRevision: new Date("2026-11-25T14:00:00.000Z"),
      },
      {
        cicloId: ciclo.id,
        nombre: "Probar horarios concretos",
        brand: "CIFES",
        ownerName: "Participante 2",
        etapaEmbudo: "Agendamiento",
        estado: "REVISION",
        metrica: "operaciones agendadas",
        problema: "La oferta de horarios es amplia y no se elige.",
        donde: "Formulario de agenda",
        datos: "160 de 400 consultas agendan.",
        explicacion: "Demasiadas opciones.",
        referencia: "Tres horarios sugeridos.",
        mecanismo: "Mostrar solo tres bloques.",
        porque: "Reduce la fricción de elegir.",
        valorInicial: "40",
        meta: "55",
        comparacion: "Semana previa",
        duracion: "7 días",
      },
      {
        cicloId: ciclo.id,
        nombre: "Activar la recompra",
        brand: "LUVANIA",
        ownerName: "Participante 3",
        etapaEmbudo: "Recompra",
        estado: "BORRADOR",
        metrica: "tasa de recompra",
        problema: "Quien ya compró no vuelve.",
        donde: "Seguimiento posterior a la compra",
        datos: "12 recompras de 38 compras.",
        explicacion: "No hay un recordatorio útil.",
        referencia: "Recordatorio de la siguiente sesión.",
        mecanismo: "Mensaje a los 21 días.",
        porque: "La recompra es el tramo más corto del embudo.",
        valorInicial: "32",
        meta: "45",
        comparacion: "Mes anterior",
        duracion: "21 días",
      },
    ],
  })
  await asegurarAprendizaje()
  await asegurarPeriodoPrevio()
  console.log("Listo. Ciclo 01 de ejemplo, sin tocar usuarios ni requerimientos existentes.")
}

const PREVIOS: Record<string, number> = {
  Consultas: 380,
  "Valoraciones agendadas": 150,
  Asistencias: 88,
  Compras: 34,
  Recompras: 10,
}

async function asegurarPeriodoPrevio() {
  const etapas = await prisma.growthEtapa.findMany({
    where: { valorPrevio: null, embudo: { ciclo: { ilustrativo: true } } },
  })
  for (const etapa of etapas) {
    const previo = PREVIOS[etapa.nombre]
    if (previo == null) continue
    await prisma.growthEtapa.update({ where: { id: etapa.id }, data: { valorPrevio: previo } })
  }
}

async function asegurarAprendizaje() {
  const ya = await prisma.growthCiclo.findFirst({ where: { nombre: "Ciclo 00", ilustrativo: true } })
  if (ya) return
  const ciclo = await prisma.growthCiclo.create({
    data: { nombre: "Ciclo 00", brand: "CIFES", ilustrativo: true, activo: false, reunion: "" },
  })
  await prisma.growthExperimento.create({
    data: {
      cicloId: ciclo.id,
      nombre: "Confirmar la cita el día anterior",
      brand: "CIFES",
      ownerName: "Participante 1",
      etapaEmbudo: "Asistencia",
      estado: "CERRADO",
      decision: "ADOPTAR",
      metrica: "tasa de asistencia",
      problema: "La persona olvida la valoración.",
      donde: "Día previo a la cita",
      datos: "Una de cada tres citas no se presenta.",
      explicacion: "No hay un recordatorio propio.",
      referencia: "Mensaje de confirmación.",
      mecanismo: "Escribir el día anterior con la hora.",
      porque: "La asistencia sube cuando la cita se confirma.",
      valorInicial: "60",
      meta: "75",
      comparacion: "Ciclo anterior",
      duracion: "14 días",
      queOcurrio: "La asistencia pasó de 60 % a 74 %.",
      evidencia: "Registro de asistencias del ciclo, datos de ejemplo.",
      limitaciones: "Solo se midió en un horario de la mañana.",
    },
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
