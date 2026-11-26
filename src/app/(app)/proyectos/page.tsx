import Link from "next/link"
import { Barra } from "@/components/barra"
import { porcentajeProyecto } from "@/lib/entregables"
import { FormularioEmpresa, FormularioProyecto } from "@/components/formularios-proyecto"
import { listarFases } from "@/server/objetivos"
import { puedeCrearProyecto } from "@/server/proyectos"
import { requireActor } from "@/server/session"
import { listarProyectos } from "@/server/proyectos"
import { prisma } from "@/lib/prisma"

const ESTADO = { PLANIFICADO: "Planificado", EN_CURSO: "En curso", EN_PAUSA: "En pausa", CERRADO: "Cerrado" }

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const empresas = await prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  const proyectos = await listarProyectos(actor, params.empresa)
  const [objetivos, fases] = await Promise.all([
    prisma.objetivo.findMany({ orderBy: { titulo: "asc" }, select: { id: true, titulo: true } }),
    listarFases(),
  ])
  const lideres = await prisma.user.findMany({
    where: { active: true, OR: [{ role: "ADMINISTRADOR" }, { areaRoles: { some: { role: "LIDER" } } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Proyectos</h1>
        <p className="mt-2 text-sm text-muted-foreground">El porcentaje del proyecto es el promedio de sus tareas. El de cada tarea sale de sus subtareas. Si no hay tareas, se calcula con los requerimientos cerrados.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className={!params.empresa ? "rounded-full bg-primary px-3 py-1 text-primary-foreground" : "rounded-full border border-border px-3 py-1"} href="/proyectos">Todas</Link>
        {empresas.map((empresa) => (
          <Link key={empresa.id} className={params.empresa === empresa.id ? "rounded-full bg-primary px-3 py-1 text-primary-foreground" : "rounded-full border border-border px-3 py-1"} href={`/proyectos?empresa=${empresa.id}`}>{empresa.name}</Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {proyectos.length === 0 ? <p className="text-sm text-muted-foreground">No hay proyectos para este filtro.</p> : proyectos.map((proyecto) => (
          <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{proyecto.empresa.name} · {ESTADO[proyecto.status]}</p>
            <h2 className="mt-1 font-heading text-2xl">{proyecto.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Responsable: {proyecto.leader.name}</p>
            <div className="mt-3 flex items-center gap-3">
              <Barra porcentaje={proyecto.avance.porcentaje} />
              <span className="text-sm font-medium" title="El porcentaje es el promedio del avance de las tareas y de los requerimientos cerrados. Si hay un requerimiento abierto, no llega a 100 %.">{proyecto.avance.porcentaje}%</span>
            </div>
            <p className="mt-2 text-xs text-[#1658B0]">Cumplimiento del plan {porcentajeProyecto(proyecto.tasks.filter((tarea) => !tarea.parentId).map((tarea) => ({ hecha: tarea.status === "HECHA" })))}%</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {proyecto.abiertos} requerimientos abiertos · {proyecto.cerrados} cerrados · {proyecto.pendientes} {proyecto.pendientes === 1 ? "tarea pendiente" : "tareas pendientes"} · {proyecto.hechas} {proyecto.hechas === 1 ? "hecha" : "hechas"}
              {proyecto.vencidas ? ` · ${proyecto.vencidas} vencidas` : ""}
            </p>
          </Link>
        ))}
      </div>
      {puedeCrearProyecto(actor) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-xl">Nueva empresa</h2>
            <div className="mt-3"><FormularioEmpresa /></div>
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-xl">Nuevo proyecto</h2>
            <div className="mt-3"><FormularioProyecto empresas={empresas} lideres={lideres} objetivos={objetivos} fases={[...new Set(fases.map((fase) => fase.nombre))]} /></div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
