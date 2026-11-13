import type { Role, Team } from "@prisma/client"
import type { Actor, Membership, RoleName, TeamName } from "@/lib/domain"

export function toActor(user: {
  id: string
  email: string
  name: string
  role: Role
  team: Team | null
  areaId: string
  active: boolean
  areaRoles: { team: Team; role: Role }[]
}): Actor {
  const memberships: Membership[] = user.areaRoles
    .filter((item) => item.role === "AGENTE" || item.role === "LIDER" || item.role === "OBSERVADOR")
    .map((item) => ({ team: item.team, role: item.role as Membership["role"] }))
  const isAdmin = user.role === "ADMINISTRADOR"
  const role: RoleName = isAdmin
    ? "ADMINISTRADOR"
    : memberships.some((item) => item.role === "LIDER")
      ? "LIDER"
      : memberships.some((item) => item.role === "AGENTE")
        ? "AGENTE"
        : memberships.some((item) => item.role === "OBSERVADOR")
          ? "OBSERVADOR"
          : "SOLICITANTE"
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    team: memberships[0]?.team ?? (user.team as TeamName | null),
    areaId: user.areaId,
    active: user.active,
    isAdmin,
    memberships,
  }
}
