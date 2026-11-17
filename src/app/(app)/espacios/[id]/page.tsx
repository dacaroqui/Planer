import Link from "next/link"
import { notFound } from "next/navigation"
import { Barra } from "@/components/barra"
import { PRIORITY_LABEL, statusLabel, type PriorityName } from "@/lib/domain"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { listarProyectos } from "@/server/proyectos"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

function conteo(items: { key: string; label: string }[]) {
  const mapa = new Map<string, { label: string; total: number }>()
  for (const item of items) {
    const actual = mapa.get(item.key) ?? { label: item.label, total: 0 }
    actual.total += 1
    mapa.set(item.key, actual)
  }
  return [...mapa.values()]
}

export default async function EspacioPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const [proyectos, casos] = await Promise.all([
    listarProyectos(actor, id),
    listar(actor, { empresaId: id, pageSize: 200 }),
  ])
  const actividad = await prisma.activity.findMany({
    where: { requestId: { in: casos.items.map((item) => item.id) }, internal: false },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { request: { select: { code: true } } },
  })
  const porEstado = conteo(casos.items.map((item) => ({ key: item.status, label: statusLabel(item.status) })))
  const porPrioridad = conteo(casos.items.map((item) => ({ key: item.priority, label: PRIORITY_LABEL[item.priority as PriorityName] ?? item.priority })))
  const porArea = conteo(casos.items.map((item) => ({ key: item.areaId, label: item.area.name })))
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Conteo titulo="Por estado" filas={porEstado} />
        <Conteo titulo="Por prioridad" filas={porPrioridad} />
        <Conteo titulo="Por área" filas={porArea} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-white p-4">
          <h2 className="text-sm font-semibold">Proyectos</h2>
          <ul className="mt-3 grid gap-3">
            {proyectos.length === 0 ? <li className="text-sm text-muted-foreground">Este espacio todavía no tiene proyectos.</li> : proyectos.map((proyecto) => (
              <li key={proyecto.id}>
                <Link href={`/proyectos/${proyecto.id}`} className="font-medium text-[#1658B0] hover:underline">{proyecto.name}</Link>
                <p className="text-xs text-muted-foreground">Responsable de proyecto: {proyecto.leader.name}</p>
                <Barra porcentaje={proyecto.avance.porcentaje} />
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-white p-4">
          <h2 className="text-sm font-semibold">Trabajo reciente</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {actividad.length === 0 ? <li className="text-muted-foreground">Todavía no hay actividad visible.</li> : actividad.map((item) => (
              <li key={item.id}><Link href={`/requerimientos/${item.request.code}`} className="text-[#1658B0] hover:underline">{item.request.code}</Link> · {item.message} <span className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Conteo({ titulo, filas }: { titulo: string; filas: { label: string; total: number }[] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-4">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <ul className="mt-2 grid gap-1 text-sm">
        {filas.length === 0 ? <li className="text-muted-foreground">Sin casos.</li> : filas.map((fila) => (
          <li key={fila.label} className="flex justify-between"><span>{fila.label}</span><span>{fila.total}</span></li>
        ))}
      </ul>
    </section>
  )
}
