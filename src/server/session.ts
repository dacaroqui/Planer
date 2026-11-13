import { redirect } from "next/navigation"
import { auth } from "@/auth"
import type { Actor } from "@/lib/domain"
import { prisma } from "@/lib/prisma"

export async function requireActor(): Promise<Actor> {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) redirect("/login")
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.active) redirect("/login?error=AccessDenied")
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    areaId: user.areaId,
    active: user.active,
  }
}
