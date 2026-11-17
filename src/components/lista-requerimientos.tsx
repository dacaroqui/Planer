"use client"

import { useEffect, useMemo, useState } from "react"
import { AccionesMasivas } from "@/components/acciones-masivas"
import { TablaRequerimientos, type FilaRequerimiento } from "@/components/tabla"

export function ListaRequerimientos({
  items,
  vacio,
  ruta,
  consulta,
  sort,
  dir,
  puedePrioridad = false,
  puedeEstado = false,
  puedeAsignar = false,
  estados,
  agentes = [],
}: {
  items: FilaRequerimiento[]
  vacio: string
  ruta: string
  consulta: string
  sort?: string
  dir?: string
  puedePrioridad?: boolean
  puedeEstado?: boolean
  puedeAsignar?: boolean
  estados?: { value: string; label: string }[]
  agentes?: { id: string; name: string }[]
}) {
  const selectable = puedePrioridad || puedeEstado || puedeAsignar
  const visibles = useMemo(() => items.map((item) => item.code), [items])
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    setSelected((prev) => prev.filter((code) => visibles.includes(code)))
  }, [visibles])

  function toggle(code: string, checked: boolean) {
    setSelected((prev) => checked ? (prev.includes(code) ? prev : [...prev, code]) : prev.filter((item) => item !== code))
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? [...visibles] : [])
  }

  return (
    <>
      <TablaRequerimientos
        items={items}
        vacio={vacio}
        ruta={ruta}
        consulta={consulta}
        sort={sort}
        dir={dir}
        selectable={selectable}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
      />
      {selectable ? (
        <AccionesMasivas
          codes={selected}
          puedePrioridad={puedePrioridad}
          puedeEstado={puedeEstado}
          puedeAsignar={puedeAsignar}
          estados={estados}
          agentes={agentes}
          onLimpiar={() => setSelected([])}
        />
      ) : null}
    </>
  )
}
