import { notFound } from "next/navigation"
import { formatDate } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function CalendarioEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const casos = await listar(actor, { empresaId: id, pageSize: 100, conPausas: false, conTareas: false })
  const conFecha = casos.items.filter((item) => item.committedDate || item.desiredDate)
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">
        {conFecha.length === 0 ? <li className="p-4 text-sm text-muted-foreground">No hay fechas comprometidas ni deseadas en este espacio.</li> : conFecha.map((item) => (
          <li key={item.code} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>{item.code} · {item.title}</span>
            <time>{formatDate(item.committedDate ?? item.desiredDate)}</time>
          </li>
        ))}
      </ul>
    </div>
  )
}
