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
  const casos = await listar(actor, { empresaId: id, pageSize: 100, conPausas: false, conTareas: false })
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
  )
}
