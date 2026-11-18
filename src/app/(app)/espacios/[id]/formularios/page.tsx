import { notFound } from "next/navigation"
import { FormularioRadicar } from "@/components/formulario-radicar"
import { type TeamName } from "@/lib/domain"
import { puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import { asegurarCatalogo } from "@/server/semilla"

function esEquipo(key: string): key is TeamName {
  return key === "DESARROLLO" || key === "MARKETING"
}

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
  const [tipos, area, marcas, prioridades, proyectos, equipos] = await Promise.all([
    prisma.requestType.findMany({ where: { active: true }, orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.area.findUnique({ where: { id: actor.areaId } }),
    prisma.catalogItem.findMany({ where: { kind: "MARCA", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { kind: "PRIORIDAD", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.proyecto.findMany({ where: { empresaId: id }, orderBy: { name: "asc" }, select: { id: true, empresaId: true, name: true } }),
    prisma.catalogItem.findMany({ where: { kind: "EQUIPO", active: true }, orderBy: { sortOrder: "asc" } }),
  ])
  return (
    <div className="space-y-4">
      <FormularioRadicar
        embebido
        volverHref={`/espacios/${id}`}
        area={area?.name ?? "su área"}
        equipos={equipos.flatMap((item) => esEquipo(item.key) ? [{
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
      />
    </div>
  )
}
