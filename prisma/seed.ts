import { PrismaClient } from "@prisma/client"
import { asegurarCatalogo } from "../src/server/semilla"
import { toActor } from "../src/lib/actor"
import { radicar, transicionar, asignar, editarCampos } from "../src/server/requests"
import { MemoryEmailProvider } from "../src/lib/email"

const prisma = new PrismaClient()

async function limpiar() {
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.slaPause.deleteMany()
  await prisma.request.deleteMany()
  await prisma.codeSequence.deleteMany()
  await prisma.areaRole.deleteMany()
  await prisma.user.deleteMany()
  await prisma.area.deleteMany()
}

async function main() {
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
  console.log("Semilla lista. Usuarios de ejemplo @cifes.edu.co, sin contraseña.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
