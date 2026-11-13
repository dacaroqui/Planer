import Link from "next/link"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { esAdmin, rolEn } from "@/lib/permissions"
import { statusLabel } from "@/lib/domain"
import { requireActor } from "@/server/session"
import { dashboard } from "@/server/requests"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const team = one("team")
  const brand = one("brand")
  const data = await dashboard(actor, { team, brand, from: one("from"), to: one("to") })
  const puede = esAdmin(actor) || actor.memberships.length > 0
  if (!puede) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Dashboard</h1>
        <p className="mt-3 text-sm text-muted-foreground">El dashboard es para los equipos y para gerencia. Como solicitante, el seguimiento está en Mis solicitudes.</p>
      </div>
    )
  }
  const soloLectura = !esAdmin(actor) && actor.memberships.every((item) => item.role === "OBSERVADOR") && !actor.memberships.some((item) => rolEn(actor, item.team) !== "OBSERVADOR")
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Abiertos por estado, creados frente a resueltos y cumplimiento de SLA. {soloLectura ? "Está en modo solo lectura." : ""}
        </p>
      </div>
      <form className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        <select name="team" defaultValue={team ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Área">
          <option value="">Todas las áreas</option>
          <option value="DESARROLLO">Desarrollo</option>
          <option value="MARKETING">Marketing</option>
        </select>
        <select name="brand" defaultValue={brand ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Marca">
          <option value="">Todas las marcas</option>
          <option value="CIFES">CIFES</option>
          <option value="LUVANIA">Luvania</option>
          <option value="AMBAS">Ambas/Transversal</option>
        </select>
        <input name="from" type="date" defaultValue={one("from")} lang="es-CO" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Desde" />
        <button className="h-9 rounded-lg bg-primary text-sm text-primary-foreground" type="submit">Recalcular</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/requerimientos?${new URLSearchParams({ ...(team ? { team } : {}), ...(brand ? { brand } : {}) }).toString()}`} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Abiertos</p>
          <p className="font-heading text-4xl">{data.abiertos}</p>
        </Link>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Cumplimiento de SLA</p>
          <p className="font-heading text-4xl">{data.cumplimiento === null ? "—" : `${data.cumplimiento} %`}</p>
        </div>
        <Link href={`/requerimientos?sla=vencido`} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Vencidos ahora</p>
          <p className="font-heading text-4xl">{data.vencidos.length}</p>
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-xl">Abiertos por estado</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.porEstado.length === 0 ? <li className="text-muted-foreground">No hay abiertos con ese filtro.</li> : data.porEstado.map((item) => (
              <li key={item.status}>
                <Link className="flex justify-between hover:underline" href={`/requerimientos?status=${item.status}${team ? `&team=${team}` : ""}`}>
                  <span>{statusLabel(item.status)}</span><span>{item.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-xl">Creados y resueltos</h2>
          <ul className="mt-3 grid gap-2">
            {data.semanas.map((semana) => (
              <li key={semana.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-xs">
                <span>{semana.label}</span>
                <span className="flex h-3 overflow-hidden rounded-full bg-muted">
                  <span className="bg-primary/70" style={{ width: `${Math.min(100, semana.creados * 12)}%` }} />
                  <span className="bg-emerald-700/70" style={{ width: `${Math.min(100, semana.resueltos * 12)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Vino: creados. Verde: resueltos. Últimas 8 semanas del periodo.</p>
        </section>
      </div>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-xl">Vencidos</h2>
        <div className="mt-3 grid gap-2">
          {data.vencidos.length === 0 ? <p className="text-sm text-muted-foreground">Ningún SLA de solución está vencido.</p> : data.vencidos.map((item) => (
            <Link key={item.id} href={`/requerimientos/${item.code}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{item.code} · {item.title}</span>
              <span className="flex gap-2"><EstadoBadge status={item.status} /><SlaBadge state={item.sla.state} /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
