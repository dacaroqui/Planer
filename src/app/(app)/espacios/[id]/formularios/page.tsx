import { notFound } from "next/navigation"
import { FormularioRadicar } from "@/components/formulario-radicar"
import { esTeam } from "@/lib/domain"
import { puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import { asegurarCatalogo } from "@/server/semilla"

export default async function FormulariosEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  if (!puedeRadicar(actor)) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Su perfil no puede radicar requerimientos.</p>
      </div>
    )
  }
  await asegurarCatalogo()
  const [tipos, area, marcas, prioridades, proyectos, equipos, politicas, roster] = await Promise.all([
    prisma.requestType.findMany({ where: { active: true }, orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.area.findUnique({ where: { id: actor.areaId } }),
    prisma.catalogItem.findMany({ where: { kind: "MARCA", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { kind: "PRIORIDAD", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.proyecto.findMany({ where: { empresaId: id }, orderBy: { name: "asc" }, select: { id: true, empresaId: true, name: true } }),
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
    <div className="space-y-4">
      <FormularioRadicar
        embebido
        volverHref={`/espacios/${id}`}
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
        empresas={[{ id: empresa.id, name: empresa.name }]}
        proyectos={proyectos}
        politicas={politicas}
        ahora={new Date().toISOString()}
        personas={personas}
        esAdministrador={actor.isAdmin}
        liderazgos={actor.memberships.filter((item) => item.role === "LIDER").map((item) => item.team)}
      />
    </div>
  )
}
