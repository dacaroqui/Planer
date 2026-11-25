import { porcentajeTarea, tareaVencida } from "@/lib/avance"
import { esEspacio } from "@/lib/domain"
import { puedeVerGrowth } from "@/lib/growth"
import { PlannerVista } from "@/components/planner-tablero"
import { esAdmin, puedeVerPlanner } from "@/lib/permissions"
import { puedeCrearProyecto, puedeGestionarTareas } from "@/server/proyectos"
import { listarPlanner } from "@/server/planner"
import { catalogoPara } from "@/server/catalogo-nav"
import { personasAsignables } from "@/server/asignacion"
import { prisma } from "@/lib/prisma"
import type { TeamName } from "@/lib/domain"
import { requireActor } from "@/server/session"

function isoFecha(fecha: Date | null) {
  if (!fecha) return null
  const anio = fecha.getUTCFullYear()
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0")
  const dia = String(fecha.getUTCDate()).padStart(2, "0")
  return `${anio}-${mes}-${dia}`
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; proyecto?: string }>
}) {
  const actor = await requireActor()
  if (!puedeVerPlanner(actor)) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Planner</h1>
        <p className="mt-3 text-sm text-muted-foreground">Planner es para quien gestiona tareas del área. Como solicitante u observador, el avance está en sus solicitudes y en los proyectos.</p>
      </div>
    )
  }
  const params = await searchParams
  const catalogo = await catalogoPara(actor)
  const empresas = catalogo.empresas
  const proyectos = catalogo.proyectos
  const preferidas = empresas.filter((item) => esEspacio(item.name))
  const baseEmpresas = preferidas.length ? preferidas : empresas
  const empresaId = baseEmpresas.some((item) => item.id === params.empresa) ? params.empresa || "" : baseEmpresas[0]?.id ?? ""
  const delEspacio = proyectos.filter((item) => item.empresaId === empresaId)
  const proyectoId = delEspacio.some((item) => item.id === params.proyecto) ? params.proyecto || "" : delEspacio[0]?.id ?? ""
  const tareas = proyectoId || puedeVerGrowth(actor)
    ? await listarPlanner(actor, { empresaId, ...(proyectoId ? { projectId: proyectoId } : {}) })
    : []
  const equipoProyecto = proyectoId
    ? (await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { team: true } }))?.team ?? null
    : null
  const asignables = await personasAsignables(actor, (equipoProyecto as TeamName | null) ?? actor.memberships[0]?.team ?? null)
  const puede = esAdmin(actor) || puedeCrearProyecto(actor) || actor.memberships.some((item) => puedeGestionarTareas(actor, item.team))
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl">Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organiza las tareas y el avance de cada proyecto.</p>
      </div>
      <PlannerVista
        empresas={empresas}
        proyectos={proyectos}
        responsables={asignables}
        empresaId={empresaId}
        proyectoId={proyectoId}
        puede={puede}
        puedeEliminar={actor.isAdmin}
        tareas={tareas.map((tarea) => ({
          id: tarea.id,
          title: tarea.title,
          status: tarea.status,
          assignee: tarea.assignee?.name ?? "Sin responsable",
          assigneeId: tarea.assigneeId ?? "",
          dueDate: isoFecha(tarea.dueDate),
          fechaInicio: isoFecha(tarea.fechaInicio),
          horasEstimadas: tarea.horasEstimadas == null ? null : Number(tarea.horasEstimadas),
          kpiNombre: tarea.kpiNombre,
          kpiMeta: tarea.kpiMeta == null ? null : Number(tarea.kpiMeta),
          kpiUnidad: tarea.kpiUnidad,
          kpiActual: tarea.kpiActual == null ? null : Number(tarea.kpiActual),
          vencida: tareaVencida(tarea),
          porcentaje: porcentajeTarea({ status: tarea.status, subtareas: tarea.children }),
          hechas: tarea.children.filter((item) => item.status === "HECHA").length,
          total: tarea.children.length,
          projectId: tarea.projectId ?? (tarea.experimentoId ? "" : proyectoId),
          requestCode: tarea.request?.code ?? null,
          sinAsociar: !tarea.requestId && !tarea.projectId && !tarea.experimentoId,
          experimentoId: tarea.experimento?.id ?? null,
          experimentoNombre: tarea.experimento?.nombre ?? null,
          subtareas: tarea.children.map((sub) => ({
            id: sub.id,
            title: sub.title,
            status: sub.status,
            assignee: sub.assignee?.name ?? "Sin responsable",
            dueDate: isoFecha(sub.dueDate),
          })),
        }))}
      />
    </div>
  )
}
