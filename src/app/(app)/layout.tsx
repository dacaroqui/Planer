import { Shell } from "@/components/shell"
import type { NavItem } from "@/components/navegacion"
import { puedeAdministrar, puedeRadicar, puedeVerPlanner } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()
  const unread = await prisma.notification.count({ where: { userId: actor.id, readAt: null } })
  const items: NavItem[] = [
    { href: "/panel", label: "Inicio", icon: "panel" },
    { href: "/proyectos", label: "Proyectos", icon: "lista" },
    { href: "/requerimientos", label: "Requerimientos", icon: "lista" },
  ]
  if (puedeVerPlanner(actor)) items.splice(2, 0, { href: "/planner", label: "Planner", icon: "planner" })
  items.push({ href: "/mis-solicitudes", label: "Mis solicitudes", icon: "lista" })
  if (puedeRadicar(actor)) items.push({ href: "/requerimientos/nuevo", label: "Radicar", icon: "radicar" })
  if (actor.isAdmin || actor.memberships.some((item) => item.role === "LIDER")) {
    items.push({ href: "/cola", label: "Cola de entrada", icon: "bandeja" })
  }
  if (actor.isAdmin || actor.memberships.length > 0) {
    items.push({ href: "/tablero", label: "Tablero", icon: "bandeja" })
    items.push({ href: "/gerencia", label: "Panel de gestión", icon: "gerencia" })
  }
  items.push({ href: "/notificaciones", label: "Avisos", icon: "avisos", badge: unread })
  if (puedeAdministrar(actor)) {
    items.push({ href: "/admin/usuarios", label: "Usuarios", icon: "usuarios" })
    items.push({ href: "/admin/catalogos", label: "Catálogos", icon: "catalogos" })
    items.push({ href: "/admin/flujos", label: "Flujos y SLA", icon: "catalogos" })
  }
  return <Shell actor={actor} items={items}>{children}</Shell>
}
