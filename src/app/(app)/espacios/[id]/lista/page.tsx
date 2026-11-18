import Link from "next/link"
import { notFound } from "next/navigation"
import { MenuEliminarRequerimiento } from "@/components/confirmar-eliminar"
import { Avatar, IconoPrioridad, IconoTipo } from "@/components/iconos-planer"
import { EstadoBadge } from "@/components/insignias"
import { prisma } from "@/lib/prisma"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function ListaEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const [casos, tareas] = await Promise.all([
    listar(actor, { empresaId: id, pageSize: 100, conPausas: false, conTareas: false }),
    prisma.tarea.findMany({
      where: { status: { not: "HECHA" }, OR: [{ request: { empresaId: id } }, { project: { empresaId: id } }] },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: { id: true, title: true, status: true, assignee: { select: { name: true } }, request: { select: { code: true } } },
    }),
  ])
  const puedeEliminar = actor.isAdmin
  return (
    <div className="overflow-hidden rounded-md border border-[#dfe1e6] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#F4F5F7] text-xs text-[#44546f]">
          <tr>
            <th className="px-3 py-2">Clave</th>
            <th className="px-3 py-2">Resumen</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Prioridad</th>
            <th className="px-3 py-2">Área</th>
            <th className="px-3 py-2">Responsable</th>
            {puedeEliminar ? <th className="px-3 py-2"><span className="sr-only">Acciones</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {casos.items.map((item) => (
            <tr key={item.code} className="border-t border-[#dfe1e6]">
              <td className="px-3 py-2">
                <Link href={`/requerimientos/${item.code}`} className="inline-flex items-center gap-1 font-medium text-[#1658B0] hover:underline">
                  <IconoTipo nombre={item.type.name} /> {item.code}
                </Link>
              </td>
              <td className="px-3 py-2">{item.title}</td>
              <td className="px-3 py-2"><EstadoBadge status={item.status} /></td>
              <td className="px-3 py-2"><IconoPrioridad prioridad={item.priority} /></td>
              <td className="px-3 py-2">{item.area.name}</td>
              <td className="px-3 py-2">
                {item.assignee ? (
                  <span className="inline-flex items-center gap-2"><Avatar nombre={item.assignee.name} marca={item.brand} />{item.assignee.name}</span>
                ) : <span className="text-muted-foreground">Sin asignar</span>}
              </td>
              {puedeEliminar ? <td className="px-3 py-2"><MenuEliminarRequerimiento code={item.code} title={item.title} /></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-[#dfe1e6] px-3 py-2 text-xs text-[#44546f]">{casos.items.length} de {casos.total}</p>
    </div>
    <section className="mt-4 rounded-md border border-[#dfe1e6] bg-white">
      <h2 className="border-b border-[#dfe1e6] px-3 py-2 text-sm font-semibold">Tareas</h2>
      {tareas.length === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">Este espacio no tiene tareas abiertas.</p> : (
        <ul className="divide-y divide-[#dfe1e6]">
          {tareas.map((tarea) => (
            <li key={tarea.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              {tarea.request ? <Link href={`/requerimientos/${tarea.request.code}`} className="rounded-full bg-[#E7F0FB] px-2 py-0.5 text-xs font-medium text-[#1658B0]">{tarea.request.code}</Link> : <span className="text-xs text-muted-foreground">Sin solicitud</span>}
              <span>{tarea.title}</span>
              <span className="text-xs text-muted-foreground">{tarea.status === "EN_CURSO" ? "En curso" : "Pendiente"} · {tarea.assignee?.name ?? "Sin responsable"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
