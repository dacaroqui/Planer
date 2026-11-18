import { Suspense } from "react"
import { porcentajeTarea, tareaVencida } from "@/lib/avance"
import { FiltrosPlanner } from "@/components/planner-filtros"
import { PlannerTablero } from "@/components/planner-tablero"
import { esAdmin, puedeVerPlanner } from "@/lib/permissions"
import { formatDate } from "@/lib/format"
import { puedeCrearProyecto, puedeGestionarTareas } from "@/server/proyectos"
import { listarPlanner } from "@/server/planner"
import { catalogoPara } from "@/server/catalogo-nav"
import { requireActor } from "@/server/session"

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; proyecto?: string; responsable?: string }>
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
  const tareas = await listarPlanner(actor, {
    empresaId: params.empresa,
    projectId: params.proyecto,
    assigneeId: params.responsable,
  })
  const catalogo = await catalogoPara(actor)
  const empresas = catalogo.empresas
  const nombreEmpresa = new Map(empresas.map((item) => [item.id, item.name]))
  const proyectos = catalogo.proyectos.map((item) => ({ ...item, empresa: nombreEmpresa.get(item.empresaId) ?? "" }))
  const responsables = catalogo.personas
  const grupos = new Map<string, { id: string; nombre: string; tareas: Parameters<typeof PlannerTablero>[0]["grupos"][number]["tareas"] }>()
  for (const tarea of tareas) {
    const id = tarea.projectId ?? "sin-proyecto"
    const nombre = tarea.project ? `${tarea.project.empresa.name} · ${tarea.project.name}` : "Sin proyecto"
    const grupo = grupos.get(id) ?? { id, nombre, tareas: [] }
    grupo.tareas.push({
      id: tarea.id,
      title: tarea.title,
      status: tarea.status,
      assignee: tarea.assignee?.name ?? "Sin responsable",
      assigneeId: tarea.assigneeId ?? "",
      dueDate: tarea.dueDate ? formatDate(tarea.dueDate) : null,
      vencida: tareaVencida(tarea),
      porcentaje: porcentajeTarea({ status: tarea.status, subtareas: tarea.children }),
      proyecto: nombre,
      projectId: id,
      requestCode: tarea.request?.code ?? null,
      subtareas: tarea.children.map((sub) => ({
        id: sub.id,
        title: sub.title,
        status: sub.status,
        assignee: sub.assignee?.name ?? "Sin responsable",
        dueDate: sub.dueDate ? formatDate(sub.dueDate) : null,
      })),
    })
    grupos.set(id, grupo)
  }
  const puede = esAdmin(actor) || puedeCrearProyecto(actor) || actor.memberships.some((item) => puedeGestionarTareas(actor, item.team))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Planner</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tablero de tareas por proyecto. El porcentaje de cada tarjeta sale de su lista de subtareas. Arrastre una tarea entre Pendiente, En curso y Hecha.
        </p>
      </div>
      <Suspense>
        <FiltrosPlanner
          empresas={empresas}
          proyectos={proyectos}
          responsables={responsables}
        />
      </Suspense>
      {grupos.size === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas con esos filtros.</p>
      ) : (
        <PlannerTablero grupos={[...grupos.values()]} puede={puede} puedeEliminar={actor.isAdmin} agentes={responsables} />
      )}
    </div>
  )
}
