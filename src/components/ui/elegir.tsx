"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { cn } from "cn"

export type Opcion = { value: string; label: string; iniciales?: string }

export function Elegir({
  value,
  onValueChange,
  opciones,
  placeholder = "Seleccionar",
  name,
  ariaLabel,
  className,
  variante = "campo",
}: {
  value: string
  onValueChange: (valor: string) => void
  opciones: Opcion[]
  placeholder?: string
  name?: string
  ariaLabel?: string
  className?: string
  variante?: "campo" | "pill"
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const lista = useId()
  useEffect(() => {
    function cerrar(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", cerrar)
    return () => document.removeEventListener("mousedown", cerrar)
  }, [])
  const actual = opciones.find((item) => item.value === value)
  return (
    <div ref={ref} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={lista}
        className={variante === "pill"
          ? "inline-flex h-11 items-center gap-2 rounded-full bg-[#E7F0FB] px-4 text-sm font-semibold text-[#1658B0]"
          : "flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-[#D9DEE7] bg-white px-3 text-sm font-medium shadow-[0_1px_2px_rgba(21,18,42,0.04)]"}
        onClick={() => setAbierto((valor) => !valor)}
      >
        <span className={cn("flex min-w-0 items-center gap-2 truncate", !actual && "font-normal text-muted-foreground")}>
          {actual?.iniciales ? <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1658B0] text-[10px] font-semibold text-white">{actual.iniciales}</span> : null}
          <span className="truncate">{actual?.label ?? placeholder}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {abierto ? (
        <ul id={lista} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full min-w-48 overflow-auto rounded-[10px] border border-[#D9DEE7] bg-white p-1 shadow-lg">
          {opciones.map((opcion) => (
            <li key={opcion.value || "vacio"}>
              <button
                type="button"
                role="option"
                aria-selected={opcion.value === value}
                className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[#F4F7FC]", opcion.value === value && "bg-[#E7F0FB] font-medium text-[#1658B0]")}
                onClick={() => { onValueChange(opcion.value); setAbierto(false) }}
              >
                {opcion.iniciales ? <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1658B0] text-[10px] font-semibold text-white">{opcion.iniciales}</span> : null}
                {opcion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ElegirVarios({
  values,
  onChange,
  opciones,
  placeholder = "Seleccionar",
  ariaLabel,
}: {
  values: string[]
  onChange: (valores: string[]) => void
  opciones: Opcion[]
  placeholder?: string
  ariaLabel?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function cerrar(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", cerrar)
    return () => document.removeEventListener("mousedown", cerrar)
  }, [])
  const libres = opciones.filter((item) => !values.includes(item.value))
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={ariaLabel} aria-expanded={abierto} className="flex min-h-11 w-full flex-wrap items-center gap-1 rounded-[10px] border border-[#D9DEE7] bg-white px-2 py-1.5 text-left text-sm shadow-[0_1px_2px_rgba(21,18,42,0.04)]" onClick={() => setAbierto((valor) => !valor)}>
        {values.length === 0 ? <span className="px-1 text-muted-foreground">{placeholder}</span> : values.map((id) => {
          const opcion = opciones.find((item) => item.value === id)
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2 py-0.5 text-xs font-medium">
              {opcion?.label ?? id}
              <span role="button" aria-label={`Quitar ${opcion?.label ?? id}`} className="text-muted-foreground" onClick={(event) => { event.stopPropagation(); onChange(values.filter((item) => item !== id)) }}>×</span>
            </span>
          )
        })}
        <ChevronDownIcon className="ml-auto size-4 text-muted-foreground" />
      </button>
      {abierto && libres.length > 0 ? (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-[10px] border border-[#D9DEE7] bg-white p-1 shadow-lg">
          {libres.map((opcion) => (
            <li key={opcion.value}>
              <button type="button" className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#F4F7FC]" onClick={() => onChange([...values, opcion.value])}>
                {opcion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ChipQuitar({ children, onQuitar }: { children: string; onQuitar: () => void }) {
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2 py-0.5 text-xs" onClick={onQuitar}>
      {children} <XIcon className="size-3" />
    </button>
  )
}
