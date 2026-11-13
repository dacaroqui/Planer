"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { transicionarAction } from "@/server/actions"
import { SlaBadge } from "@/components/insignias"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type Tarjeta = {
  code: string
  title: string
  brand: string
  priority: string
  assignee: string
  tipo: string
  status: string
  column: string
  sla: "A_TIEMPO" | "EN_RIESGO" | "VENCIDO" | "EN_PAUSA" | "CUMPLIDO" | "INCUMPLIDO" | "NO_APLICA"
  moves: { name: string; column: string }[]
}

export function Tablero({ columnas, tarjetas, soloLectura }: { columnas: string[]; tarjetas: Tarjeta[]; soloLectura: boolean }) {
  const router = useRouter()
  const [marca, setMarca] = useState("TODAS")
  const [responsable, setResponsable] = useState("TODOS")
  const [tipo, setTipo] = useState("TODOS")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const responsables = [...new Set(tarjetas.map((item) => item.assignee))]
  const tipos = [...new Set(tarjetas.map((item) => item.tipo))]
  const visibles = tarjetas.filter((item) => (marca === "TODAS" || item.brand === marca) && (responsable === "TODOS" || item.assignee === responsable) && (tipo === "TODOS" || item.tipo === tipo))

  function soltar(event: React.DragEvent<HTMLElement>, columna: string) {
    event.preventDefault()
    const code = event.dataTransfer.getData("text/plain")
    const tarjeta = tarjetas.find((item) => item.code === code)
    const move = tarjeta?.moves.find((item) => item.column === columna)
    if (!tarjeta || !move) {
      setError("Esa columna no es una transición permitida para su rol.")
      return
    }
    setError(null)
    const data = new FormData()
    data.set("code", code)
    data.set("name", move.name)
    start(async () => {
      const result = await transicionarAction(data)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(result.message || "Transición hecha.")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={marca} onValueChange={setMarca}>
          <SelectTrigger className="w-full" aria-label="Marca"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas las marcas</SelectItem>
            <SelectItem value="CIFES">CIFES</SelectItem>
            <SelectItem value="LUVANIA">Luvania</SelectItem>
            <SelectItem value="AMBAS">Ambas/Transversal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            {tipos.map((nombre) => <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={responsable} onValueChange={setResponsable}>
          <SelectTrigger className="w-full" aria-label="Responsable"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los responsables</SelectItem>
            {responsables.map((nombre) => <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columnas.map((columna) => (
          <section
            key={columna}
            className="w-72 shrink-0 rounded-xl bg-muted/70 p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { if (!soloLectura) soltar(event, columna) }}
          >
            <h2 className="px-1 py-2 text-sm font-medium">{columna}</h2>
            <div className="grid gap-2">
              {visibles.filter((item) => item.column === columna).map((item) => (
                <article
                  key={item.code}
                  draggable={!soloLectura && !pending}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", item.code)}
                  className="rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <Link href={`/requerimientos/${item.code}`} className="font-medium hover:underline">{item.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{item.code} · {item.brand} · {item.priority}</p>
                  <p className="text-xs text-muted-foreground">{item.assignee}</p>
                  <div className="mt-2"><SlaBadge state={item.sla} /></div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
