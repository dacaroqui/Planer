import "dotenv/config"
import { prisma, sembrar } from "../prisma/seed"

sembrar()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
