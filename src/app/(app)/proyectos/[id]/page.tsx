import Link from "next/link"
import { notFound } from "next/navigation"
import { Barra } from "@/components/barra"
import { EstadoBadge } from "@/components/insignias"
import { TareasPanel } from "@/components/tareas-panel"
import { formatDate } from "@/lib/format"
import { puedeCrearProyecto, puedeGestionarTareas, detalleProyecto } from "@/server/proyectos"
import { requireActor } from "@/server/session"
import { prisma } from "@/lib/prisma"
import { TEXTO_AVANCE, tareaVencida } from "@/lib/avance"
import { NombreMiga } from "@/components/migas"

const ESTADO = { PLANIFICADO: "Planificado", EN_CURSO: "En curso", EN_PAUSA: "En pausa", CERRADO: "Cerrado" }

export default async function ProyectoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const proyecto = await detalleProyecto(actor, id)
  if (!proyecto) notFound()
  const agentes = await prisma.user.findMany({
    where: { active: true, OR: [{ role: "ADMINISTRADOR" }, { areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const puede = puedeCrearProyecto(actor) || actor.memberships.some((item) => item.role === "AGENTE" || item.role === "LIDER")
  return (
    <div className="space-y-6">
      <NombreMiga nombre={proyecto.name} />
      <Link href="/proyectos" className="text-sm text-muted-foreground hover:underline">Volver a proyectos</Link>
      <div>
        <p className="text-sm text-muted-foreground">{proyecto.empresa.name} · {ESTADO[proyecto.status]}</p>
        <h1 className="font-heading text-4xl">{proyecto.name}</h1>
        <p className="mt-2 max-w-2xl text-sm">{proyecto.description}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Responsable: {proyecto.leader.name} · {formatDate(proyecto.startsAt)} a {formatDate(proyecto.targetAt)}
        </p>
        <div className="mt-4 flex max-w-md items-center gap-3">
          <Barra porcentaje={proyecto.avance.porcentaje} />
          <span className="text-sm font-medium">{proyecto.avance.porcentaje}%</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {proyecto.avance.fuente === "vacio" ? "Aún no hay trabajo asociado." : TEXTO_AVANCE}
        </p>
      </div>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-2xl">Requerimientos</h2>
        <div className="mt-3 grid gap-2">
          {proyecto.avanceRequerimientos.length === 0 ? <p className="text-sm text-muted-foreground">Ningún requerimiento está asociado.</p> : proyecto.avanceRequerimientos.map((item) => (
            <Link key={item.id} href={`/requerimientos/${item.code}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{item.code} · {item.title}</span>
              <span className="flex items-center gap-2"><EstadoBadge status={item.status} /><span>{item.avance.porcentaje}%</span></span>
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-2xl">Tareas del proyecto</h2>
        <div className="mt-3">
          <TareasPanel
            porcentaje={proyecto.avance.porcentaje}
            puede={puede && proyecto.requests.some((item) => puedeGestionarTareas(actor, item.team)) || puedeCrearProyecto(actor)}
            puedeEliminar={actor.isAdmin}
            projectId={proyecto.id}
            agentes={agentes}
            tareas={proyecto.tasks.map((tarea) => ({
              id: tarea.id,
              title: tarea.title,
              status: tarea.status,
              dueDate: tarea.dueDate ? formatDate(tarea.dueDate) : null,
              fechaInicio: tarea.fechaInicio ? formatDate(tarea.fechaInicio) : null,
              assignee: tarea.assignee?.name ?? "Sin responsable",
              horasEstimadas: tarea.horasEstimadas == null ? null : Number(tarea.horasEstimadas),
              horasReales: tarea.horasReales == null ? null : Number(tarea.horasReales),
              kpiNombre: tarea.kpiNombre,
              kpiMeta: tarea.kpiMeta == null ? null : Number(tarea.kpiMeta),
              kpiUnidad: tarea.kpiUnidad,
              kpiActual: tarea.kpiActual == null ? null : Number(tarea.kpiActual),
              vencida: tareaVencida(tarea),
            }))}
          />
        </div>
      </section>
    </div>
  )
}
