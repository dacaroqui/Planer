import Link from "next/link"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
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

export function TablaRequerimientos({
  items,
  vacio,
  ruta,
  consulta = "",
  sort,
  dir,
}: {
  items: FilaRequerimiento[]
  vacio: string
  ruta?: string
  consulta?: string
  sort?: string
  dir?: string
}) {
  function orden(columna: string) {
    if (!ruta) return undefined
    const params = new URLSearchParams(consulta)
    const siguiente = sort === columna && dir !== "asc" ? "asc" : "desc"
    params.set("sort", columna)
    params.set("dir", siguiente)
    params.delete("page")
    const query = params.toString()
    return query ? `${ruta}?${query}` : ruta
  }
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
              <TableHead><Orden href={orden("title")} activo={sort === "title"}>Requerimiento</Orden></TableHead>
              <TableHead><Orden href={orden("status")} activo={sort === "status"}>Estado</Orden></TableHead>
              <TableHead>SLA</TableHead>
              <TableHead><Orden href={orden("code")} activo={sort === "code"}>Código</Orden></TableHead>
              <TableHead><Orden href={orden("requester")} activo={sort === "requester"}>Solicitante</Orden></TableHead>
              <TableHead><Orden href={orden("updatedAt")} activo={sort === "updatedAt"}>Actualizado</Orden></TableHead>
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
                <TableCell>{item.code}</TableCell>
                <TableCell>{item.requester.name}</TableCell>
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

function Orden({ href, activo, children }: { href?: string; activo?: boolean; children: React.ReactNode }) {
  if (!href) return <>{children}</>
  return <Link href={href} className={activo ? "underline" : "hover:underline"}>{children}</Link>
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
