import Link from "next/link"
import { notFound } from "next/navigation"
import { NombreMiga } from "@/components/migas"
import { PestanasEspacio } from "@/components/pestanas-espacio"
import { Barra } from "@/components/barra"
import { prisma } from "@/lib/prisma"
import { listarProyectos } from "@/server/proyectos"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function EspacioPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const [proyectos, casos] = await Promise.all([
    listarProyectos(actor, id),
    listar(actor, { empresaId: id, openOnly: true, pageSize: 8 }),
  ])
  return (
    <div className="space-y-4">
      <NombreMiga nombre={empresa.name} />
      <div>
        <p className="text-xs text-muted-foreground">Espacio</p>
        <h1 className="text-2xl font-semibold">{empresa.name}</h1>
      </div>
      <PestanasEspacio id={id} actual="resumen" />
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
            {casos.items.length === 0 ? <li className="text-muted-foreground">No hay requerimientos abiertos en este espacio.</li> : casos.items.map((item) => (
              <li key={item.code}><Link href={`/requerimientos/${item.code}`} className="text-[#1658B0] hover:underline">{item.code}</Link> · {item.title}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
