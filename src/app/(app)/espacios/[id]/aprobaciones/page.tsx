import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function AprobacionesEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const casos = await listar(actor, { empresaId: id, pageSize: 100 })
  const pendientes = casos.items.filter((item) => item.status === "EN_VALIDACION" || item.status === "EN_APROBACION" || item.status === "EN_ANALISIS")
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">
        {pendientes.length === 0 ? <li className="p-4 text-sm text-muted-foreground">No hay entregas ni análisis pendientes de aprobación.</li> : pendientes.map((item) => (
          <li key={item.code} className="px-4 py-2 text-sm">
            <Link href={`/requerimientos/${item.code}`} className="font-medium text-[#1658B0] hover:underline">{item.code}</Link>
            <span> · {item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
