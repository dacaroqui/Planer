import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function usuario() {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, active: true, pendiente: true, deactivatedAt: true },
  })
  if (!user?.active || user.pendiente || user.deactivatedAt) return null
  return user
}

export async function GET() {
  const user = await usuario()
  if (!user) return Response.json({ unread: 0, items: [] }, { status: 401 })
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      include: { request: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])
  return Response.json({
    unread,
    items: items.map((item) => ({
      id: item.id,
      subject: item.subject,
      body: item.body,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      href: item.href || (item.request ? `/requerimientos/${item.request.code}` : null),
    })),
  })
}

export async function POST(request: Request) {
  const user = await usuario()
  if (!user) return Response.json({ ok: false }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { id?: unknown; todos?: unknown }
  if (body.todos === true) {
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } })
  } else if (typeof body.id === "string" && body.id) {
    await prisma.notification.updateMany({ where: { id: body.id, userId: user.id, readAt: null }, data: { readAt: new Date() } })
  }
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } })
  return Response.json({ ok: true, unread })
}
