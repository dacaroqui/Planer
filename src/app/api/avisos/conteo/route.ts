import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) return Response.json({ unread: 0 }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, active: true } })
  if (!user?.active) return Response.json({ unread: 0 }, { status: 401 })
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } })
  return Response.json({ unread })
}
