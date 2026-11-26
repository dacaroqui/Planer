import { PlanTrabajo } from "@/components/plan-trabajo"
import { esEspacio, TEAMS, TEAM_LABEL } from "@/lib/domain"
import { etiquetaArea } from "@/lib/plan-trabajo"
import { esAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listarProyectos } from "@/server/proyectos"
import { listarEntregables, listarPlan, responsablesDeArea } from "@/server/plan-trabajo"
import { requireActor } from "@/server/session"

export default async function PlanPage() {
  const actor = await requireActor()
  const [proyectos, filas, gente, empresas, entregables] = await Promise.all([
    listarProyectos(actor),
    listarPlan(actor),
    responsablesDeArea(null),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    listarEntregables(actor),
  ])
  const empresa = empresas.find((item) => esEspacio(item.name)) ?? empresas[0]
  return (
    <div className="space-y-4">
      <PlanTrabajo
        filas={filas}
        proyectos={proyectos.map((item) => ({
          id: item.id,
          name: item.name,
          team: item.team,
          area: etiquetaArea(item.team, item.description),
          inicio: item.startsAt.toISOString().slice(0, 10),
          fin: item.targetAt.toISOString().slice(0, 10),
        }))}
        responsables={gente.map((persona) => ({
          id: persona.id,
          name: persona.name,
          teams: persona.areaRoles.map((rol) => rol.team),
        }))}
        esAdmin={esAdmin(actor)}
        empresaId={empresa?.id ?? ""}
        equipos={TEAMS.map((team) => ({ value: team, label: TEAM_LABEL[team] }))}
        entregables={entregables.map((item) => ({
          id: item.id,
          proyectoId: item.proyectoId,
          nombre: item.nombre,
          fecha: item.fechaCompromiso ? item.fechaCompromiso.toISOString().slice(0, 10) : null,
          orden: item.orden,
        }))}
      />
    </div>
  )
}
