import { prisma } from "@/lib/prisma"
import { agruparAsignables } from "@/lib/asignacion"
import { esAdmin } from "@/lib/permissions"
import type { Actor, TeamName } from "@/lib/domain"

export async function personasAsignables(actor: Actor, team?: TeamName | null) {
  const [admins, miembros] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, deactivatedAt: null, role: "ADMINISTRADOR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { active: true, deactivatedAt: null, areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, areaRoles: { select: { team: true, role: true } } },
    }),
  ])
  return agruparAsignables({
    esAdmin: esAdmin(actor),
    team,
    admins,
    miembros: miembros.map((persona) => ({
      id: persona.id,
      name: persona.name,
      teams: persona.areaRoles.filter((rol) => rol.role === "AGENTE" || rol.role === "LIDER").map((rol) => rol.team),
    })),
  })
}
