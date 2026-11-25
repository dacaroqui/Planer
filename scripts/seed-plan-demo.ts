import "dotenv/config"
import { prisma } from "../src/lib/prisma"

const MARCA = "plan-demo"

const PROYECTOS: { nombre: string; area: string; team: "MARKETING" | "DESARROLLO"; tareas: { titulo: string; rol?: string; bloqueo?: string; estado?: "PENDIENTE" | "EN_CURSO" | "HECHA" }[] }[] = [
  {
    nombre: "Seguimiento plantillas",
    area: "Marketing",
    team: "MARKETING",
    tareas: [],
  },
  {
    nombre: "Escuela Cifes",
    area: "Marketing",
    team: "MARKETING",
    tareas: [
      { titulo: "Creación de plan de contenidos para escuela.", rol: "David y Edwin", bloqueo: "Necesitamos el guion" },
      { titulo: "Parrilla mensual" },
      { titulo: "Letreros de impresión para publicidad de la caracas", rol: "Valeria" },
      { titulo: "Impresiones de los vinilos. Los gráficos de las ventanas", rol: "Valeria & Stephanie" },
      { titulo: "Grabaciones de la parrilla del SMM", rol: "Valeria" },
      { titulo: "Edición", rol: "Valeria" },
      { titulo: "Videos de actualización de escuela. Videos de la plataforma." },
    ],
  },
  {
    nombre: "Conexión Dashboard",
    area: "Marketing y Producto",
    team: "MARKETING",
    tareas: [
      { titulo: "Conectar Repo de formularios - Github (pasar acceso)" },
      { titulo: "Reunión con Juan (Hoy) 1pm", rol: "Fernando" },
      { titulo: "Implementación local" },
      { titulo: "Recibir Accesos" },
    ],
  },
  {
    nombre: "Estrategia Marketing",
    area: "Marketing",
    team: "MARKETING",
    tareas: [
      { titulo: "Gestionar Iva Portafolios de Meta", rol: "Miguel" },
      { titulo: "Accesos", rol: "Fernando" },
      { titulo: "Solicitar reunion de Maryori", rol: "Fernando" },
      { titulo: "Entregar Capcut y Meta", rol: "Fernando", bloqueo: "Aviso" },
      { titulo: "Solucionar pagos de meta", rol: "Fernando", bloqueo: "Grabaciones" },
    ],
  },
  {
    nombre: "Recibir Repositorios",
    area: "Marketing y Producto",
    team: "MARKETING",
    tareas: [
      { titulo: "Conectar una unica carpeta de B-rolls", rol: "Oscar - Hugo" },
      { titulo: "Conectar Repo de formularios al equipo", rol: "Fernando" },
      { titulo: "Reunión de repositorios", rol: "Fernando" },
      { titulo: "Implementación local de repositorios" },
      { titulo: "Recibir accesos de los repositorios", rol: "Fernando" },
    ],
  },
  {
    nombre: "Planeacion de contenido Redes y Ads",
    area: "Marketing (Seguimiento producto)",
    team: "MARKETING",
    tareas: [
      { titulo: "Poner link del canal en redes" },
      { titulo: "Crear Google ads" },
      { titulo: "Establecer investigación", rol: "Edwin y Equipo", estado: "EN_CURSO" },
      { titulo: "Formular contenido", rol: "Edwin y David" },
      { titulo: "Plan de mitigación grabaciones", rol: "Edwin y Hugo" },
      { titulo: "Validación con gerencia para el Control de operacion", rol: "Edwin, Chrystian, David" },
      { titulo: "Posibles ajustes", rol: "David y Hugo" },
      { titulo: "Recolectar requerimientos para parrilla youtube", rol: "David, Fernando y Edwin" },
    ],
  },
]

async function asegurarAdmin() {
  const ya = await prisma.user.findFirst({ where: { role: "ADMINISTRADOR", active: true }, orderBy: { createdAt: "asc" } })
  if (ya) return ya
  const area = await prisma.area.findFirst() ?? await prisma.area.create({ data: { name: "Dirección" } })
  return prisma.user.create({
    data: { name: "Admin Ejemplo", email: "admin.ejemplo@cifes.edu.co", role: "ADMINISTRADOR", areaId: area.id },
  })
}

function tituloConSufijo(tarea: { titulo: string; rol?: string; bloqueo?: string }) {
  const partes = [tarea.titulo]
  if (tarea.rol) {
    const lista = tarea.rol.split(/\s*(?:,|&| y |-)\s*/).map((item) => item.trim()).filter((item) => item && item.toLowerCase() !== "equipo")
    partes.push(`Participantes: ${lista.join(", ")}`)
    partes.push(`Rol en Excel: ${tarea.rol}`)
  }
  if (tarea.bloqueo) partes.push(`Bloqueo: ${tarea.bloqueo}`)
  return partes.join(" — ")
}

async function main() {
  const ya = await prisma.proyecto.findFirst({ where: { description: { contains: MARCA }, name: "Escuela Cifes" } })
  if (ya) {
    await complementar()
    console.log("El plan de ejemplo ya existe. Se completó el contraste de área y un responsable, sin tocar usuarios ni requerimientos.")
    return
  }
  const admin = await asegurarAdmin()
  const empresa = await prisma.empresa.findFirst({ where: { active: true, name: { contains: "CIFES", mode: "insensitive" } } })
    ?? await prisma.empresa.findFirst({ where: { active: true } })
    ?? await prisma.empresa.create({ data: { name: "CIFES" } })
  const inicio = new Date("2026-11-01T00:00:00.000Z")
  const fin = new Date("2026-11-30T00:00:00.000Z")
  for (const proyecto of PROYECTOS) {
    const creado = await prisma.proyecto.create({
      data: {
        name: proyecto.nombre,
        description: `Área: ${proyecto.area}\n${MARCA}`,
        team: proyecto.team,
        empresaId: empresa.id,
        leaderId: admin.id,
        startsAt: inicio,
        targetAt: fin,
        status: "EN_CURSO",
      },
    })
    if (proyecto.tareas.length === 0) continue
    await prisma.tarea.createMany({
      data: proyecto.tareas.map((tarea) => ({
        title: tituloConSufijo(tarea),
        status: tarea.estado ?? "PENDIENTE",
        projectId: creado.id,
        createdById: admin.id,
      })),
    })
  }
  await complementar()
  console.log("Listo. Plan de ejemplo con sufijos en los títulos. No se modificaron usuarios ni requerimientos.")
}

async function complementar() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMINISTRADOR", active: true }, orderBy: { createdAt: "asc" } })
  const empresa = await prisma.empresa.findFirst({ where: { active: true } })
  if (!admin || !empresa) return
  const pieza = await prisma.proyecto.findFirst({ where: { name: "Pieza de producto", description: { contains: MARCA } } })
  if (!pieza) {
    const creado = await prisma.proyecto.create({
      data: {
        name: "Pieza de producto",
        description: `Área: Producto\n${MARCA}`,
        team: "DESARROLLO",
        empresaId: empresa.id,
        leaderId: admin.id,
        startsAt: new Date("2026-11-01T00:00:00.000Z"),
        targetAt: new Date("2026-11-30T00:00:00.000Z"),
        status: "EN_CURSO",
      },
    })
    await prisma.tarea.create({
      data: {
        title: "Revisar el componente del aula — Participantes: Helena — Rol en Excel: Helena",
        projectId: creado.id,
        createdById: admin.id,
      },
    })
  }
  await prisma.tarea.updateMany({
    where: { title: { startsWith: "Establecer investigación" }, assigneeId: null, project: { description: { contains: MARCA } } },
    data: { assigneeId: admin.id, horasEstimadas: 6, horasReales: 2, kpiNombre: "Investigaciones", kpiMeta: 4, kpiActual: 1, kpiUnidad: "piezas" },
  })
  await prisma.tarea.updateMany({
    where: { title: { startsWith: "Parrilla mensual" }, horasEstimadas: null, project: { description: { contains: MARCA } } },
    data: { horasEstimadas: 8, horasReales: 3, kpiNombre: "Piezas publicadas", kpiMeta: 4, kpiActual: 1, kpiUnidad: "videos" },
  })
  await prisma.tarea.updateMany({
    where: { title: { startsWith: "Creación de plan de contenidos" }, horasEstimadas: null, project: { description: { contains: MARCA } } },
    data: { horasEstimadas: 10, kpiNombre: "Guiones", kpiMeta: 5, kpiActual: 2, kpiUnidad: "%" },
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
