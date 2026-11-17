import { redirect } from "next/navigation"
import { auth } from "@/auth"
import type { Actor } from "@/lib/domain"
import { toActor } from "@/lib/actor"
import { prisma } from "@/lib/prisma"

export { toActor }

export async function requireActor(): Promise<Actor> {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) redirect("/login")
  const user = await prisma.user.findUnique({ where: { email }, include: { areaRoles: true } })
  if (!user?.active || user.pendiente) redirect("/login?error=AccessDenied")
  return toActor(user)
}
