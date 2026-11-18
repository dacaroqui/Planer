"use client"

import { Fragment, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronRightIcon, PlusIcon } from "lucide-react"
import { Avatar, IconoPrioridad, IconoTipo } from "@/components/iconos-planer"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { prioridadMasivaAction } from "@/server/actions"
import { TEAM_LABEL, type SlaState, type TeamName } from "@/lib/domain"
import { tiempoRelativo } from "@/lib/planer-ui"

export type FilaLista = {
  code: string
  title: string
  status: string
  priority: string
  team: TeamName
  tipo: string
  area: string
  marca: string
  sla: SlaState
  asignado: string | null
  actualizado: string
  subtareas: { id: string; title: string; status: string }[]
}

export function ListaJira({
  items,
  total,
  puedePrioridad,
  puedeCrear,
}: {
  items: FilaLista[]
  total: number
  puedePrioridad: boolean
  puedeCrear: boolean
}) {
  const router = useRouter()
  const [elegidos, setElegidos] = useState<string[]>([])
  const [abiertos, setAbiertos] = useState<string[]>([])
  const [pending, start] = useTransition()
  function alternar(code: string, marcado: boolean) {
    setElegidos((prev) => marcado ? [...prev, code] : prev.filter((item) => item !== code))
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <form action="/requerimientos" className="min-w-48 flex-1">
          <input name="q" aria-label="Buscar actividad" placeholder="Buscar actividad" className="h-8 w-full rounded-md border border-input px-2 text-sm" />
        </form>
        <span className="text-xs text-muted-foreground">Filtro</span>
        <span className="text-xs text-muted-foreground">Agrupar</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-[#F4F7FC] text-xs text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2"><span className="sr-only">Seleccionar</span></th>
              <th className="w-8 px-1" />
              <th className="px-2 py-2 font-medium">Clave</th>
              <th className="px-2 py-2 font-medium">Resumen</th>
              <th className="px-2 py-2 font-medium">Persona asignada</th>
              <th className="px-2 py-2 font-medium">Estado</th>
              <th className="px-2 py-2 font-medium">Prioridad</th>
              <th className="px-2 py-2 font-medium">Área</th>
              <th className="px-2 py-2 font-medium">SLA</th>
              <th className="px-2 py-2 font-medium">Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const abierto = abiertos.includes(item.code)
              return (
                <Fragment key={item.code}>
                  <tr className="border-t border-border hover:bg-[#F4F7FC]">
                    <td className="px-2 py-1.5">
                      <input type="checkbox" aria-label={`Seleccionar ${item.code}`} checked={elegidos.includes(item.code)} onChange={(event) => alternar(item.code, event.target.checked)} />
                    </td>
                    <td>
                      {item.subtareas.length > 0 ? (
                        <button type="button" aria-expanded={abierto} aria-label={abierto ? "Ocultar subtareas" : "Mostrar subtareas"} onClick={() => setAbiertos((prev) => abierto ? prev.filter((code) => code !== item.code) : [...prev, item.code])}>
                          <ChevronRightIcon className={`size-4 ${abierto ? "rotate-90" : ""}`} />
                        </button>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <Link href={`/requerimientos/${item.code}`} className="inline-flex items-center gap-1 font-medium text-[#1658B0] hover:underline">
                        <IconoTipo nombre={item.tipo} /> {item.code}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-2 py-1.5">{item.title}</td>
                    <td className="px-2 py-1.5">
                      {item.asignado ? <span className="inline-flex items-center gap-2"><Avatar nombre={item.asignado} marca={item.marca} />{item.asignado}</span> : "Sin asignar"}
                    </td>
                    <td className="px-2 py-1.5"><EstadoBadge status={item.status} /></td>
                    <td className="px-2 py-1.5"><IconoPrioridad prioridad={item.priority} /></td>
                    <td className="px-2 py-1.5">{item.area || TEAM_LABEL[item.team]}</td>
                    <td className="px-2 py-1.5"><SlaBadge state={item.sla} /></td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">{tiempoRelativo(new Date(item.actualizado))}</td>
                  </tr>
                  {abierto ? item.subtareas.map((sub) => (
                    <tr key={sub.id} className="border-t border-border bg-[#F4F7FC]/60 text-xs">
                      <td />
                      <td />
                      <td className="px-2 py-1 text-muted-foreground" colSpan={2}>
                        <span className="inline-flex items-center gap-1 pl-4"><IconoTipo nombre={sub.title} subtarea /> {sub.title}</span>
                      </td>
                      <td />
                      <td className="px-2">{sub.status === "HECHA" ? "Hecha" : sub.status === "EN_CURSO" ? "En curso" : "Pendiente"}</td>
                      <td colSpan={4} />
                    </tr>
                  )) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm">
        {puedeCrear ? <Link href="/mis-solicitudes/radicar" className="inline-flex items-center gap-1 text-[#1658B0] hover:underline"><PlusIcon className="size-4" /> Crear</Link> : <span />}
        <span className="text-xs text-muted-foreground">{items.length} de {total}</span>
      </div>
      {puedePrioridad && elegidos.length > 0 ? (
        <form className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-white px-3 py-2 shadow-[0_-4px_12px_rgba(21,18,42,0.06)]" onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          data.set("codes", elegidos.join(","))
          start(async () => {
            const result = await prioridadMasivaAction(data)
            if (!result.ok) toast.error(result.error)
            else {
              toast.success(result.message || "Prioridad actualizada.")
              setElegidos([])
              router.refresh()
            }
          })
        }}>
          <span className="text-sm">{elegidos.length} seleccionados</span>
          <select name="priority" aria-label="Nueva prioridad" className="h-8 rounded-md border border-input px-2 text-sm" defaultValue="MEDIA">
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
          <button className="h-8 rounded-md bg-[#1658B0] px-3 text-sm text-white disabled:opacity-60" disabled={pending} type="submit">Aplicar prioridad</button>
        </form>
      ) : null}
    </div>
  )
}
