import Link from "next/link"
import { notFound } from "next/navigation"
import { NombreMiga } from "@/components/migas"
import { PestanasEspacio } from "@/components/pestanas-espacio"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function AdjuntosEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const casos = await listar(actor, { empresaId: id, pageSize: 200 })
  const archivos = await prisma.attachment.findMany({
    where: { requestId: { in: casos.items.map((item) => item.id) } },
    orderBy: { createdAt: "desc" },
    include: { request: { select: { code: true, title: true } } },
  })
  return (
    <div className="space-y-4">
      <NombreMiga nombre={empresa.name} />
      <h1 className="text-2xl font-semibold">{empresa.name}</h1>
      <PestanasEspacio id={id} actual="adjuntos" />
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">
        {archivos.length === 0 ? <li className="p-4 text-sm text-muted-foreground">Este espacio no tiene adjuntos visibles.</li> : archivos.map((archivo) => (
          <li key={archivo.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <span>
              <Link href={`/api/adjuntos/${archivo.id}`} className="font-medium text-[#1658B0] hover:underline">{archivo.filename}</Link>
              <span className="text-muted-foreground"> · {archivo.request.code} {archivo.request.title}</span>
            </span>
            <time className="text-xs text-muted-foreground">{formatDateTime(archivo.createdAt)}</time>
          </li>
        ))}
      </ul>
    </div>
  )
}
