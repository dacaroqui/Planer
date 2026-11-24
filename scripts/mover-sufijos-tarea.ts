import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { parsearTituloPlan } from "../src/lib/plan-trabajo"

async function main() {
  const tareas = await prisma.tarea.findMany({
    select: { id: true, title: true, participantes: true, bloqueo: true, notaRol: true },
  })
  let cambiadas = 0
  for (const tarea of tareas) {
    const parsed = parsearTituloPlan(tarea.title)
    const limpio = parsed.titulo.length >= 3 ? parsed.titulo : tarea.title
    const haySufijo = limpio !== tarea.title
    if (!haySufijo) continue
    await prisma.tarea.update({
      where: { id: tarea.id },
      data: {
        title: limpio,
        participantes: tarea.participantes ?? (parsed.participantes.join(", ") || null),
        bloqueo: tarea.bloqueo ?? (parsed.bloqueo || null),
        notaRol: tarea.notaRol ?? (parsed.notaRol || null),
      },
    })
    cambiadas += 1
  }
  console.log(`Listo. ${cambiadas} tareas movieron el sufijo a sus columnas. No se tocaron usuarios ni requerimientos.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
