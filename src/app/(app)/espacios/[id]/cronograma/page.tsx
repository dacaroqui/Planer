import { notFound } from "next/navigation"
import { Barra } from "@/components/barra"
import { formatDate } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { listarProyectos } from "@/server/proyectos"
import { requireActor } from "@/server/session"

export default async function CronogramaEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const proyectos = await listarProyectos(actor, id)
  return (
    <div className="space-y-4">
      <ul className="grid gap-3">
        {proyectos.length === 0 ? <li className="text-sm text-muted-foreground">No hay proyectos para armar el cronograma.</li> : proyectos.map((proyecto) => (
          <li key={proyecto.id} className="rounded-lg border border-border bg-white p-4">
            <p className="font-medium">{proyecto.name}</p>
            <p className="text-xs text-muted-foreground">{formatDate(proyecto.startsAt)} → {formatDate(proyecto.targetAt)} · {proyecto.leader.name}</p>
            <div className="mt-2"><Barra porcentaje={proyecto.avance.porcentaje} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
