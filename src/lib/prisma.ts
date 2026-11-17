import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Una instancia no abre más de unas pocas lecturas a la vez. El tope real
// (connection_limit, hasta 5 en producción) va en DATABASE_URL, no aquí.
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
