"use client"

import { useEffect, useState } from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

type Opcion = { value: string; label: string }

export function EditorLinea({
  valor,
  etiqueta,
  tipo = "texto",
  opciones,
  puedeEditar,
  onGuardar,
}: {
  valor: string
  etiqueta: string
  tipo?: "texto" | "numero" | "fecha" | "lista"
  opciones?: Opcion[]
  puedeEditar: boolean
  onGuardar: (valor: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(valor)
  const [visto, setVisto] = useState(valor)
  useEffect(() => {
    setVisto(valor)
    if (!editando) setBorrador(valor)
  }, [valor, editando])
  const cruda = opciones?.find((opcion) => opcion.value === visto)?.label || visto
  const vista = tipo === "fecha" && /^\d{4}-\d{2}-\d{2}$/.test(cruda) ? `${cruda.slice(8, 10)}/${cruda.slice(5, 7)}/${cruda.slice(0, 4)}` : (cruda || "—")

  async function guardar() {
    const anterior = visto
    setVisto(borrador)
    setEditando(false)
    const resultado = await onGuardar(borrador)
    if (!resultado.ok) {
      setVisto(anterior)
      setBorrador(anterior)
      toast.error(resultado.error || "No se pudo guardar.")
      return
    }
    toast.success("Guardado.")
  }

  function cancelar() {
    setBorrador(visto)
    setEditando(false)
  }

  function teclas(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault()
      void guardar()
    }
    if (event.key === "Escape") {
      event.preventDefault()
      cancelar()
    }
  }

  if (!puedeEditar) {
    return (
      <span className="text-sm">
        <span className="block text-[10px] uppercase tracking-wide text-[#98A2B3]">{etiqueta}</span>
        {vista}
      </span>
    )
  }
  if (!editando) {
    return (
      <button type="button" aria-label={`Editar ${etiqueta}`} className="rounded px-1 py-0.5 text-left text-sm hover:bg-[#E7F0FB]" onClick={() => { setBorrador(visto); setEditando(true) }}>
        <span className="block text-[10px] uppercase tracking-wide text-[#98A2B3]">{etiqueta}</span>
        {vista}
      </button>
    )
  }
  const clase = "h-8 rounded border border-[#1658B0] bg-white px-2 text-sm"
  return (
    <span className="inline-flex items-center gap-1">
      {tipo === "lista" ? (
        <select aria-label={etiqueta} value={borrador} onChange={(event) => setBorrador(event.target.value)} onKeyDown={teclas} className={`${clase} max-w-48`}>
          {opciones?.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
        </select>
      ) : (
        <input
          autoFocus
          aria-label={etiqueta}
          type={tipo === "fecha" ? "date" : "text"}
          inputMode={tipo === "numero" ? "decimal" : undefined}
          lang={tipo === "fecha" ? "es-CO" : undefined}
          value={borrador}
          onChange={(event) => setBorrador(event.target.value)}
          onKeyDown={teclas}
          className={`${clase} ${tipo === "numero" ? "w-24" : tipo === "fecha" ? "w-36" : "w-44"}`}
        />
      )}
      <button type="button" aria-label={`Guardar ${etiqueta}`} className="inline-flex size-8 items-center justify-center rounded-md bg-[#1658B0] text-white" onClick={() => { void guardar() }}><CheckIcon className="size-4" /></button>
      <button type="button" aria-label={`Cancelar ${etiqueta}`} className="inline-flex size-8 items-center justify-center rounded-md border border-[#E4E7EC] bg-white text-[#15122A]" onClick={cancelar}><XIcon className="size-4" /></button>
    </span>
  )
}
