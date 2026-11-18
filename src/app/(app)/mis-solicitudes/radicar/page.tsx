import { FormularioRadicar } from "@/components/formulario-radicar"
import { puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { esTeam } from "@/lib/domain"
import { requireActor } from "@/server/session"
import { asegurarCatalogo } from "@/server/semilla"

export default async function RadicarSolicitudPage() {
  const actor = await requireActor()
  if (!puedeRadicar(actor)) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-3xl">Radicar solicitud</h1>
        <p className="mt-3 text-sm text-muted-foreground">Su perfil es de solo lectura. Puede consultar el estado y el historial, pero no radica requerimientos.</p>
      </div>
    )
  }
  await asegurarCatalogo()
  const [tipos, area, marcas, prioridades, empresas, proyectos, areas, equipos, politicas, roster] = await Promise.all([
    prisma.requestType.findMany({ where: { active: true }, orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.area.findUnique({ where: { id: actor.areaId } }),
    prisma.catalogItem.findMany({ where: { kind: "MARCA", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { kind: "PRIORIDAD", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.proyecto.findMany({ orderBy: { name: "asc" }, select: { id: true, empresaId: true, name: true } }),
    actor.isAdmin ? prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    prisma.catalogItem.findMany({ where: { kind: "EQUIPO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.slaPolicy.findMany({ where: { active: true }, select: { team: true, typeId: true, priority: true, resolutionMinutes: true } }),
    prisma.user.findMany({
      where: { active: true, areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, areaRoles: { select: { team: true, role: true } } },
    }),
  ])
  const personas = roster.flatMap((usuario) => usuario.areaRoles.flatMap((rol) => rol.role === "AGENTE" || rol.role === "LIDER" ? [{ id: usuario.id, name: usuario.name, team: rol.team, role: rol.role }] : []))
  return (
    <FormularioRadicar
      area={area?.name ?? "su área"}
      equipos={equipos.flatMap((item) => esTeam(item.key) ? [{
        key: item.key,
        name: item.name,
        description: item.description,
        icon: item.icon,
        color: item.color,
      }] : [])}
      tipos={tipos.map((tipo) => ({ id: tipo.id, team: tipo.team, name: tipo.name, description: tipo.description, extra: tipo.extra }))}
      marcas={marcas.map((item) => ({ key: item.key, name: item.name }))}
      prioridades={prioridades.map((item) => ({ key: item.key, name: item.name }))}
      empresas={empresas.map((item) => ({ id: item.id, name: item.name }))}
      proyectos={proyectos}
      areas={areas}
      politicas={politicas}
      ahora={new Date().toISOString()}
      personas={personas}
      esAdministrador={actor.isAdmin}
      liderazgos={actor.memberships.filter((item) => item.role === "LIDER").map((item) => item.team)}
    />
  )
}
