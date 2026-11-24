import { ClipboardListIcon } from "lucide-react"
import { PlanTrabajo } from "@/components/plan-trabajo"
import { listarProyectos } from "@/server/proyectos"
import { listarPlan, responsablesDeArea } from "@/server/plan-trabajo"
import { requireActor } from "@/server/session"

export default async function PlanPage() {
  const actor = await requireActor()
  const [proyectos, filas, gente] = await Promise.all([
    listarProyectos(actor),
    listarPlan(actor),
    responsablesDeArea(null),
  ])
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
        hayProyectos={proyectos.length > 0}
        filas={filas}
        responsables={gente.map((persona) => ({
          id: persona.id,
          name: persona.name,
          teams: persona.areaRoles.map((rol) => rol.team),
        }))}
      />
    </div>
  )
}
