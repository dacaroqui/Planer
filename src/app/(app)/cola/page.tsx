import Link from "next/link"
import { EstadoBadge } from "@/components/insignias"
import { formatDateTime } from "@/lib/format"
import { BRAND_LABEL, PRIORITY_LABEL, type BrandName, type PriorityName } from "@/lib/domain"
import { esAdmin, rolEn } from "@/lib/permissions"
import { requireActor } from "@/server/session"
import { listar } from "@/server/requests"

export default async function ColaPage() {
  const actor = await requireActor()
  const areas = actor.memberships.filter((item) => item.role === "LIDER").map((item) => item.team)
  if (!esAdmin(actor) && areas.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Cola de entrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">La cola de requerimientos nuevos es del líder de cada área.</p>
      </div>
    )
  }
  const team = esAdmin(actor) ? undefined : areas[0]
  const data = await listar(actor, {
    onlyNew: true,
    team,
    sort: "createdAt",
    dir: "asc",
    pageSize: 50,
  })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Cola de entrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Requerimientos en estado Nuevo{team ? ` de ${team === "DESARROLLO" ? "Desarrollo" : "Marketing"}` : ""}, del más antiguo al más reciente.
          {areas.length > 1 || (esAdmin(actor) && rolEn(actor, "DESARROLLO")) ? "" : ""}
        </p>
      </div>
      <div className="grid gap-2">
        {data.items.length === 0 ? <p className="text-sm text-muted-foreground">No hay requerimientos nuevos en su cola.</p> : data.items.map((item) => (
          <Link key={item.code} href={`/requerimientos/${item.code}`} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{item.title}</span>
              <EstadoBadge status={item.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.code} · {PRIORITY_LABEL[item.priority as PriorityName] ?? item.priority} · {BRAND_LABEL[item.brand as BrandName] ?? item.brand} · {formatDateTime(item.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
