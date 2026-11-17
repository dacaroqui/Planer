import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { listarProyectos } from "@/server/proyectos"
import { requireActor } from "@/server/session"

export default async function PaginasEspacio({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const proyectos = await listarProyectos(actor, id)
  return (
    <ul className="grid gap-2">
      {proyectos.length === 0 ? <li className="text-sm text-[#44546f]">Este espacio no tiene páginas de proyecto.</li> : proyectos.map((proyecto) => (
        <li key={proyecto.id} className="rounded-md border border-[#dfe1e6] bg-white px-4 py-3">
          <Link href={`/proyectos/${proyecto.id}`} className="font-medium text-[#1658B0] hover:underline">{proyecto.name}</Link>
          <p className="text-sm text-[#44546f]">{proyecto.description || "Sin descripción."}</p>
        </li>
      ))}
    </ul>
  )
}
