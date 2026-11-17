import { Marco } from "@/components/marco"
import { puedeAdministrar, puedeRadicar, puedeVerPlanner } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { opcionesVisibles } from "@/server/requests"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()
  const [unread, opciones] = await Promise.all([
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
    opcionesVisibles(actor),
  ])
  const lider = actor.isAdmin || actor.memberships.some((item) => item.role === "LIDER")
  const equipo = actor.isAdmin || actor.memberships.length > 0
  return (
    <Marco
      actor={actor}
      espacios={opciones.empresas.map((item) => ({ id: item.id, name: item.name }))}
      unread={unread}
      puedeAdmin={puedeAdministrar(actor)}
      puedeRadicar={puedeRadicar(actor)}
      puedePlanner={puedeVerPlanner(actor)}
      puedeCola={lider}
      puedeTablero={equipo}
    >
      {children}
    </Marco>
  )
}
