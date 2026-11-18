"use client"

import Link from "next/link"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PRIORITY_LABEL, TEAM_LABEL, type SlaState, type TeamName } from "@/lib/domain"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

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
  area?: { name: string } | null
}

export function TablaRequerimientos({
  items,
  vacio,
  ruta,
  consulta = "",
  sort,
  dir,
  selectable = false,
  selected = [],
  onToggle,
  onToggleAll,
}: {
  items: FilaRequerimiento[]
  vacio: string
  ruta?: string
  consulta?: string
  sort?: string
  dir?: string
  selectable?: boolean
  selected?: string[]
  onToggle?: (code: string, checked: boolean) => void
  onToggleAll?: (checked: boolean) => void
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
  const todos = items.length > 0 && items.every((item) => selected.includes(item.code))
  const algunos = items.some((item) => selected.includes(item.code)) && !todos
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
              {selectable ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-foreground"
                    aria-label="Seleccionar todos"
                    checked={todos}
                    ref={(node) => {
                      if (node) node.indeterminate = algunos
                    }}
                    onChange={(event) => onToggleAll?.(event.target.checked)}
                  />
                </TableHead>
              ) : null}
              <TableHead><Orden href={orden("title")} activo={sort === "title"}>Requerimiento</Orden></TableHead>
              <TableHead><Orden href={orden("status")} activo={sort === "status"}>Estado</Orden></TableHead>
              <TableHead>SLA</TableHead>
              <TableHead><Orden href={orden("code")} activo={sort === "code"}>Código</Orden></TableHead>
              <TableHead><Orden href={orden("requester")} activo={sort === "requester"}>Solicitante</Orden></TableHead>
              <TableHead><Orden href={orden("area")} activo={sort === "area"}>Área</Orden></TableHead>
              <TableHead><Orden href={orden("updatedAt")} activo={sort === "updatedAt"}>Actualizado</Orden></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const marcado = selected.includes(item.code)
              return (
                <TableRow key={item.code} className={cn(marcado && "bg-muted/50")}>
                  {selectable ? (
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-foreground"
                        aria-label={`Seleccionar ${item.code}`}
                        checked={marcado}
                        onChange={(event) => onToggle?.(item.code, event.target.checked)}
                      />
                    </TableCell>
                  ) : null}
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
                  <TableCell>{item.area?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.updatedAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => {
          const marcado = selected.includes(item.code)
          return (
            <div key={item.code} className={cn("flex gap-3 rounded-xl border border-border bg-card p-4", marcado && "bg-muted/50")}>
              {selectable ? (
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-foreground"
                  aria-label={`Seleccionar ${item.code}`}
                  checked={marcado}
                  onChange={(event) => onToggle?.(item.code, event.target.checked)}
                />
              ) : null}
              <Link href={`/requerimientos/${item.code}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoBadge status={item.status} />
                  <SlaBadge state={item.sla.state} />
                </div>
                <p className="mt-3 font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.code} · {item.area?.name ?? "Sin área"} · {TEAM_LABEL[item.team]} · {item.assignee?.name ?? "Sin asignar"}
                </p>
              </Link>
            </div>
          )
        })}
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
