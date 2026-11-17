import { porcentajeTarea, tareaVencida } from "@/lib/avance"
import { PlannerTablero } from "@/components/planner-tablero"
import { esAdmin, puedeVerPlanner } from "@/lib/permissions"
import { formatDate } from "@/lib/format"
import { puedeCrearProyecto, puedeGestionarTareas } from "@/server/proyectos"
import { listarPlanner } from "@/server/planner"
import { opcionesVisibles } from "@/server/requests"
import { requireActor } from "@/server/session"
import { prisma } from "@/lib/prisma"

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
  const opciones = await opcionesVisibles(actor)
  const ids = [...new Set([...opciones.personas.map((item) => item.id), actor.id])]
  const responsables = await prisma.user.findMany({
    where: { id: { in: ids }, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const empresas = opciones.empresas
  const proyectos = opciones.proyectos
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
        <h1 className="font-heading text-4xl">Planner</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tablero de tareas por proyecto. El porcentaje de cada tarjeta sale de su lista de subtareas. Arrastre una tarea entre Pendiente, En curso y Hecha.
        </p>
      </div>
      <form className="grid gap-2 sm:grid-cols-4">
        <select name="empresa" defaultValue={params.empresa ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Empresa">
          <option value="">Todas las empresas</option>
          {empresas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="proyecto" defaultValue={params.proyecto ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Proyecto">
          <option value="">Todos los proyectos</option>
          {proyectos.map((item) => <option key={item.id} value={item.id}>{item.empresa.name} · {item.name}</option>)}
        </select>
        <select name="responsable" defaultValue={params.responsable ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Responsable">
          <option value="">Todos los responsables</option>
          {responsables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="h-9 rounded-lg bg-primary text-sm text-primary-foreground" type="submit">Filtrar</button>
      </form>
      {grupos.size === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas con esos filtros.</p>
      ) : (
        <PlannerTablero grupos={[...grupos.values()]} puede={puede} agentes={responsables} />
      )}
    </div>
  )
}
