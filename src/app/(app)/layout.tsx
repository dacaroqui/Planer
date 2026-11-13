import { Shell } from "@/components/shell"
import type { NavItem } from "@/components/navegacion"
import { puedeAdministrar, puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()
  const unread = await prisma.notification.count({ where: { userId: actor.id, readAt: null } })
  const items: NavItem[] = [
    { href: "/panel", label: "Panel", icon: "panel" },
    { href: "/requerimientos", label: "Requerimientos", icon: "lista" },
  ]
  if (puedeRadicar(actor)) items.push({ href: "/requerimientos/nuevo", label: "Radicar", icon: "radicar" })
  if (actor.role === "AGENTE" || actor.role === "LIDER" || actor.role === "ADMINISTRADOR") {
    items.push({ href: "/bandeja", label: "Bandeja", icon: "bandeja" })
  }
  items.push({ href: "/gerencia", label: "Gerencia", icon: "gerencia" })
  items.push({ href: "/notificaciones", label: "Avisos", icon: "avisos", badge: unread })
  if (puedeAdministrar(actor)) {
    items.push({ href: "/admin/usuarios", label: "Usuarios", icon: "usuarios" })
    items.push({ href: "/admin/catalogos", label: "Catálogos", icon: "catalogos" })
  }
  return <Shell actor={actor} items={items}>{children}</Shell>
}
