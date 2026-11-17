import { prisma } from "@/lib/prisma"
import { hashClave, validarClave } from "@/lib/clave"

export async function asegurarAdminInicial() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ""
  if (!email || !password) return { creado: false as const }
  const error = validarClave(password, email)
  if (error) throw new Error(error)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { creado: false as const }
  let area = await prisma.area.findFirst({ where: { active: true }, orderBy: { name: "asc" } })
  if (!area) area = await prisma.area.create({ data: { name: "Dirección" } })
  await prisma.user.create({
    data: {
      email,
      name: "Administrador",
      role: "ADMINISTRADOR",
      areaId: area.id,
      active: true,
      pendiente: false,
      passwordHash: await hashClave(password),
    },
  })
  console.log(`Administrador inicial creado: ${email}`)
  return { creado: true as const }
}
