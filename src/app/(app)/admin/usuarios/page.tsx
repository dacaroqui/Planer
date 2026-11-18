import { redirect } from "next/navigation"
import { UsuariosAdmin } from "@/components/usuarios-admin"
import { appBaseUrl } from "@/lib/email"
import { estadoEnlace } from "@/lib/invitacion-estado"
import { puedeAdministrar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import { catalogos } from "@/server/requests"
import type { TeamName } from "@/lib/domain"

export default async function UsuariosPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const [data, empresas, invitaciones] = await Promise.all([
    catalogos(),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.invitacion.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ])
  const areas = data.areas.filter((area) => area.active).map((area) => ({ id: area.id, name: area.name }))
  return (
    <UsuariosAdmin
      areas={areas}
      empresas={empresas}
      usuarios={data.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        areaId: user.areaId,
        area: user.area.name,
        active: user.active,
        pendiente: user.pendiente,
        isAdmin: user.role === "ADMINISTRADOR",
        empresaIds: user.empresas.map((item) => item.empresaId),
        areaIds: user.areasExtra.map((item) => item.areaId),
        memberships: user.areaRoles
          .filter((item) => item.role === "AGENTE" || item.role === "LIDER" || item.role === "OBSERVADOR")
          .map((item) => ({ team: item.team as TeamName, role: item.role as "AGENTE" | "LIDER" | "OBSERVADOR" })),
      }))}
      invitaciones={invitaciones.map((item) => ({
        id: item.id,
        email: item.email,
        role: item.role,
        estado: estadoEnlace(item),
        enlace: item.tokenPlain ? `${appBaseUrl()}/invitar/${item.tokenPlain}` : "",
      }))}
    />
  )
}
