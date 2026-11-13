import Link from "next/link"
import { EquipoBadge, EstadoBadge, SlaBadge } from "@/components/insignias"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PRIORITY_LABEL, type SlaState, type TeamName } from "@/lib/domain"
import { formatDateTime } from "@/lib/format"

export type FilaRequerimiento = {
  code: string
  title: string
  status: string
  team: TeamName
  priority: string
  brand: string
  updatedAt: Date
  requester: { name: string }
  assignee: { name: string } | null
  type: { name: string }
  sla: { state: SlaState }
}

export function TablaRequerimientos({ items, vacio }: { items: FilaRequerimiento[]; vacio: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <p className="font-heading text-xl">Nada por aquí</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{vacio}</p>
      </div>
    )
  }
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requerimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Asignado</TableHead>
              <TableHead>Actualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.code}>
                <TableCell>
                  <Link href={`/requerimientos/${item.code}`} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.code} · {item.type.name} · {PRIORITY_LABEL[item.priority as keyof typeof PRIORITY_LABEL] ?? item.priority} · {item.requester.name}
                  </p>
                </TableCell>
                <TableCell><EstadoBadge status={item.status} /></TableCell>
                <TableCell><SlaBadge state={item.sla.state} /></TableCell>
                <TableCell><EquipoBadge team={item.team} /></TableCell>
                <TableCell>{item.assignee?.name ?? "Sin asignar"}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <Link key={item.code} href={`/requerimientos/${item.code}`} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge status={item.status} />
              <SlaBadge state={item.sla.state} />
            </div>
            <p className="mt-3 font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.code} · {item.team === "DESARROLLO" ? "Desarrollo" : "Marketing"} · {item.assignee?.name ?? "Sin asignar"}
            </p>
          </Link>
        ))}
      </div>
    </>
  )
}

export function Paginacion({ page, pages, ruta, query }: { page: number; pages: number; ruta: string; query: string }) {
  if (pages <= 1) return null
  const href = (next: number) => {
    const params = new URLSearchParams(query)
    params.set("page", String(next))
    return `${ruta}?${params.toString()}`
  }
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">Página {page} de {pages}</p>
      <div className="flex gap-2">
        {page > 1 ? <Link className="rounded-lg border border-border px-3 py-1.5" href={href(page - 1)}>Anterior</Link> : null}
        {page < pages ? <Link className="rounded-lg border border-border px-3 py-1.5" href={href(page + 1)}>Siguiente</Link> : null}
      </div>
    </div>
  )
}
