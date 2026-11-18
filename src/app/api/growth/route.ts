import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { toActor } from "@/lib/actor"
import { puedeVerGrowth } from "@/lib/growth"

export async function GET() {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) return Response.json({ error: "No autorizado." }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email }, include: { areaRoles: true } })
  if (!user?.active) return Response.json({ error: "No autorizado." }, { status: 401 })
  const actor = toActor(user)
  if (!puedeVerGrowth(actor)) return Response.json({ error: "Growth es solo para el equipo de Growth y los administradores." }, { status: 403 })
  const ciclo = await prisma.growthCiclo.findFirst({ where: { activo: true } })
  return Response.json({ ciclo: ciclo?.nombre ?? null })
}
