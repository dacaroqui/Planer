import { ClipboardListIcon } from "lucide-react"
import { PlanTrabajo } from "@/components/plan-trabajo"
import { esEspacio, TEAMS, TEAM_LABEL } from "@/lib/domain"
import { etiquetaArea } from "@/lib/plan-trabajo"
import { esAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listarProyectos } from "@/server/proyectos"
import { listarPlan, responsablesDeArea } from "@/server/plan-trabajo"
import { requireActor } from "@/server/session"

export default async function PlanPage() {
  const actor = await requireActor()
  const [proyectos, filas, gente, empresas] = await Promise.all([
    listarProyectos(actor),
    listarPlan(actor),
    responsablesDeArea(null),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ])
  const empresa = empresas.find((item) => esEspacio(item.name)) ?? empresas[0]
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[#E7F0FB] text-[#1658B0]"><ClipboardListIcon className="size-5" /></span>
        <div>
          <h1 className="font-heading text-4xl text-[#15122A]">Plan de trabajo</h1>
          <p className="mt-1 text-sm text-muted-foreground">La hoja del equipo: un proyecto, sus actividades y lo que las frena.</p>
        </div>
      </div>
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
      />
    </div>
  )
}
