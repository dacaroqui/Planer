import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { asegurarAdminInicial } from "../src/server/admin-inicial"

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("Defina ADMIN_EMAIL y ADMIN_PASSWORD.")
    process.exit(1)
  }
  const result = await asegurarAdminInicial()
  if (!result.creado) console.log("El administrador ya existía. No se cambió la contraseña.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
