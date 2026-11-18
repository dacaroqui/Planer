import { Suspense } from "react"
import { Esqueleto } from "@/components/esqueleto"
import { Marco } from "@/components/marco"
import { alcanceRendimiento } from "@/lib/rendimiento"
import { puedeAdministrar, puedeRadicar, puedeVerPlanner } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { catalogoPara } from "@/server/catalogo-nav"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()
  const catalogo = await catalogoPara(actor)
  const unread = await prisma.notification.count({ where: { userId: actor.id, readAt: null } })
  const lider = actor.isAdmin || actor.memberships.some((item) => item.role === "LIDER")
  const equipo = actor.isAdmin || actor.memberships.length > 0
  const alcance = alcanceRendimiento(actor)
  const rendimiento = alcance.tipo === "ninguno" ? null : alcance.tipo === "propio" ? "propio" as const : "equipo" as const
  return (
    <Marco
      actor={actor}
      espacios={catalogo.empresas.map((item) => ({ id: item.id, name: item.name }))}
      unread={unread}
      puedeAdmin={puedeAdministrar(actor)}
      puedeRadicar={puedeRadicar(actor)}
      puedePlanner={puedeVerPlanner(actor)}
      puedeCola={lider}
      puedeTablero={equipo}
      rendimiento={rendimiento}
    >
      <Suspense fallback={<Esqueleto />}>{children}</Suspense>
    </Marco>
  )
}
