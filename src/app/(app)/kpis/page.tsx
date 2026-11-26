import Link from "next/link"
import { GaugeIcon, UsersIcon } from "lucide-react"
import { redirect } from "next/navigation"
import { puedeVerMatriz } from "@/lib/objetivos"
import { requireActor } from "@/server/session"

export default async function KpisPage() {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const lider = actor.isAdmin || actor.memberships.some((item) => item.role === "LIDER")
  const enlaces = [
    { href: "/kpis/areas", titulo: "KPIs por área", texto: "Los indicadores del área y los de sus objetivos.", icono: GaugeIcon },
    ...(lider ? [{ href: "/kpis/personas", titulo: "KPIs por persona", texto: "Un principal y hasta cuatro de apoyo por persona.", icono: UsersIcon }] : []),
    { href: "/kpis/mios", titulo: "Mis KPIs", texto: "Registre sus mediciones y proponga la meta.", icono: GaugeIcon },
  ]
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-4xl text-[#15122A]">KPIs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Indicadores del área, de la persona y los suyos.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enlaces.map((enlace) => {
          const Icono = enlace.icono
          return (
          <Link key={enlace.href} href={enlace.href} className="rounded-xl border border-[#E4E7EC] bg-white p-4 hover:border-[#1658B0]">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#E7F0FB] text-[#1658B0]"><Icono className="size-4" /></span>
            <h2 className="mt-3 font-heading text-2xl">{enlace.titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{enlace.texto}</p>
          </Link>
          )
        })}
      </div>
    </div>
  )
}
