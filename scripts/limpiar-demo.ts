import { unlink } from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import { resolverDirectorioAdjuntos } from "../src/lib/files"
import { conservarUsuario, resumenLimpieza, type ConteosLimpieza } from "../src/lib/limpiar-demo"

const prisma = new PrismaClient()
const seco = process.argv.includes("--dry-run")

async function borrarArchivos(claves: string[]) {
  const locales = resolverDirectorioAdjuntos()
  let blobs = 0
  let localesBorrados = 0
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const usarBlob = (process.env.STORAGE_DRIVER || "").trim() === "vercel-blob" && Boolean(token)
  let del: ((ruta: string) => Promise<unknown>) | null = null
  if (usarBlob) {
    const modulo = await import("@vercel/blob")
    del = modulo.del
  } else if ((process.env.STORAGE_DRIVER || "").trim() === "vercel-blob") {
    console.log("STORAGE_DRIVER=vercel-blob, pero no hay BLOB_READ_WRITE_TOKEN. No se llamó a del().")
  }
  for (const clave of claves) {
    if (del) {
      try {
        await del(`adjuntos/${clave}`)
        blobs += 1
      } catch (error) {
        console.error(`No se pudo borrar el blob adjuntos/${clave}`, error)
      }
    }
    try {
      await unlink(path.join(locales, clave))
      localesBorrados += 1
    } catch {
      // El archivo local ya no está. La segunda corrida sigue siendo válida.
    }
  }
  console.log(`Blobs borrados con del(): ${blobs}. Archivos locales borrados: ${localesBorrados}.`)
}

async function main() {
  const [solicitudes, tareas, pausas, comentarios, actividades, adjuntos, proyectos, invitaciones, usuarios, secuencias, auditorias] = await Promise.all([
    prisma.request.count(),
    prisma.tarea.count(),
    prisma.slaPause.count(),
    prisma.comment.count(),
    prisma.activity.count(),
    prisma.attachment.findMany({ select: { storedName: true } }),
    prisma.proyecto.count(),
    prisma.invitacion.count(),
    prisma.user.findMany({ select: { id: true, email: true } }),
    prisma.codeSequence.findMany({ select: { prefix: true } }),
    prisma.auditLog.count(),
  ])
  const demo = usuarios.filter((usuario) => !conservarUsuario(usuario.email))
  const conteo: ConteosLimpieza = {
    solicitudes,
    tareas,
    pausas,
    comentarios,
    historial: actividades + auditorias,
    adjuntos: adjuntos.length,
    proyectos,
    invitaciones,
    usuarios: demo.length,
    secuencias: secuencias.map((item) => item.prefix),
  }
  console.log(resumenLimpieza(conteo, seco))
  if (seco) return

  await borrarArchivos(adjuntos.map((item) => item.storedName))
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.slaPause.deleteMany(),
    prisma.tarea.deleteMany(),
    prisma.request.deleteMany(),
    prisma.proyecto.deleteMany(),
    prisma.invitacion.deleteMany(),
    prisma.restablecimiento.deleteMany({ where: { userId: { in: demo.map((item) => item.id) } } }),
    prisma.user.deleteMany({ where: { id: { in: demo.map((item) => item.id) } } }),
    prisma.codeSequence.deleteMany(),
  ])
  console.log("Listo. La siguiente solicitud de cada equipo sale con el consecutivo 0001.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
