import Link from "next/link"
import { redirect } from "next/navigation"
import { puedeVerGrowth } from "@/lib/growth"
import { listarCiclos } from "@/server/growth"
import { requireActor } from "@/server/session"

export default async function CiclosPage() {
  const actor = await requireActor()
  if (!puedeVerGrowth(actor)) redirect("/panel")
  const ciclos = await listarCiclos(actor)
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-4xl">Ciclos</h1>
      <ul className="grid gap-2">
        {ciclos.length === 0 ? <li className="text-sm text-muted-foreground">Todavía no hay ciclos. El script de ejemplo crea el Ciclo 01.</li> : ciclos.map((ciclo) => (
          <li key={ciclo.id} className="rounded-lg border border-[#E4E7EC] bg-white px-4 py-3 text-sm">
            <Link href={`/growth?ciclo=${ciclo.id}`} className="font-medium text-[#1658B0]">{ciclo.nombre}</Link>
            <span className="text-muted-foreground"> · {ciclo.brand} · {ciclo._count.experimentos} experimentos{ciclo.activo ? " · activo" : ""}{ciclo.ilustrativo ? " · datos de ejemplo" : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
