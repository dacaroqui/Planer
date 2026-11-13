"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { EstadoBadge } from "@/components/insignias"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"

export type Solicitud = {
  code: string
  title: string
  team: string
  status: string
  assignee: string
  updatedAt: string
}

export function ListaMisSolicitudes({ items }: { items: Solicitud[] }) {
  const [filtro, setFiltro] = useState<"abiertos" | "cerrados">("abiertos")
  const visibles = useMemo(() => items.filter((item) => {
    const cerrado = ["CERRADO", "RECHAZADO", "CANCELADO"].includes(item.status)
    return filtro === "cerrados" ? cerrado : !cerrado
  }), [items, filtro])
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={filtro === "abiertos" ? "default" : "outline"} onClick={() => setFiltro("abiertos")}>Abiertos</Button>
        <Button type="button" size="sm" variant={filtro === "cerrados" ? "default" : "outline"} onClick={() => setFiltro("cerrados")}>Cerrados</Button>
      </div>
      {visibles.length === 0 ? <p className="text-sm text-muted-foreground">No tiene requerimientos en este grupo.</p> : (
        <div className="grid gap-2">
          {visibles.map((item) => (
            <Link key={item.code} href={`/requerimientos/${item.code}`} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                <EstadoBadge status={item.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.code} · {item.team === "DESARROLLO" ? "Desarrollo" : "Marketing"} · {item.assignee} · {formatDateTime(new Date(item.updatedAt))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
