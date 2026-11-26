"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { EditorLinea } from "@/components/editor-linea"
import { SelloBloqueo } from "@/components/objetivos-ui"
import { META_LABEL } from "@/lib/objetivos"
import { editarCampoKpiAction, eliminarKpiAction } from "@/server/objetivos-actions"

export type KpiLinea = {
  id: string
  nombre: string
  unidad: string
  actual: number | null
  meta: number | null
  estado: "EN_LINEA_BASE" | "PROPUESTA" | "APROBADA"
  actividades: number
  bloqueado?: boolean
  motivo?: string
}

const ESTADOS = (Object.keys(META_LABEL) as KpiLinea["estado"][]).map((value) => ({ value, label: META_LABEL[value] }))

function texto(valor: number | null) {
  return valor == null ? "" : String(valor)
}

export function KpiInline({ kpi, puedeEditar, puedeMeta }: { kpi: KpiLinea; puedeEditar: boolean; puedeMeta: boolean }) {
  const router = useRouter()
  const [oculto, setOculto] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  if (oculto) return null
  async function guardar(campo: "nombre" | "unidad" | "actual" | "meta" | "estado", valor: string) {
    const resultado = await editarCampoKpiAction({ id: kpi.id, campo, valor })
    if (resultado.ok) router.refresh()
    return resultado
  }
  async function eliminar() {
    setOculto(true)
    setConfirmar(false)
    const resultado = await eliminarKpiAction({ id: kpi.id })
    if (!resultado.ok) {
      setOculto(false)
      toast.error(resultado.error)
      return
    }
    toast.success(resultado.actividades ? `KPI eliminado. ${resultado.actividades} ${resultado.actividades === 1 ? "actividad quedó" : "actividades quedaron"} sin este KPI.` : "KPI eliminado.")
    router.refresh()
  }
  const vinculo = kpi.actividades === 1 ? "1 actividad vinculada quedará sin este KPI." : `${kpi.actividades} actividades vinculadas quedarán sin este KPI.`
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#E4E7EC] p-2">
      <EditorLinea valor={kpi.nombre} etiqueta="Nombre" puedeEditar={puedeEditar} onGuardar={(valor) => guardar("nombre", valor)} />
      <EditorLinea valor={texto(kpi.meta)} etiqueta="Meta" tipo="numero" puedeEditar={puedeEditar && puedeMeta} onGuardar={(valor) => guardar("meta", valor)} />
      <EditorLinea valor={kpi.unidad} etiqueta="Unidad" puedeEditar={puedeEditar} onGuardar={(valor) => guardar("unidad", valor)} />
      <EditorLinea valor={texto(kpi.actual)} etiqueta="Valor actual" tipo="numero" puedeEditar={puedeEditar} onGuardar={(valor) => guardar("actual", valor)} />
      <EditorLinea valor={kpi.estado} etiqueta="Estado" tipo="lista" opciones={ESTADOS} puedeEditar={puedeEditar && puedeMeta} onGuardar={(valor) => guardar("estado", valor)} />
      <SelloBloqueo bloqueado={Boolean(kpi.bloqueado)} motivo={kpi.motivo || ""} />
      {puedeEditar ? (
        <span className="relative">
          <button type="button" aria-label={`Eliminar ${kpi.nombre}`} className="inline-flex size-8 items-center justify-center rounded-md text-red-700 hover:bg-red-50" onClick={() => setConfirmar((valor) => !valor)}><Trash2Icon className="size-4" /></button>
          {confirmar ? (
            <span role="dialog" aria-label="Confirmar eliminación" className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-[#E4E7EC] bg-white p-3 text-sm shadow">
              <p>¿Eliminar «{kpi.nombre}»? {vinculo}</p>
              <span className="mt-2 flex gap-2">
                <button type="button" className="h-8 rounded-md bg-red-700 px-2 text-xs font-medium text-white" onClick={() => { void eliminar() }}>Eliminar</button>
                <button type="button" className="h-8 rounded-md border border-[#E4E7EC] px-2 text-xs" onClick={() => setConfirmar(false)}>Cancelar</button>
              </span>
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

export function AltaKpi({ onCrear }: { onCrear: (nombre: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState("")
  const [enviando, setEnviando] = useState(false)

  async function guardar() {
    const textoNombre = nombre.trim()
    if (textoNombre.length < 2) {
      toast.error("Indique el nombre del KPI.")
      return
    }
    setEnviando(true)
    const resultado = await onCrear(textoNombre)
    setEnviando(false)
    if (!resultado.ok) {
      toast.error(resultado.error || "No se pudo agregar el KPI.")
      return
    }
    setNombre("")
    setAbierto(false)
    toast.success("KPI agregado.")
  }

  if (!abierto) {
    return (
      <button type="button" className="mt-2 h-9 rounded-lg border border-dashed border-[#1658B0] px-3 text-sm text-[#1658B0]" onClick={() => setAbierto(true)}>+ Agregar KPI</button>
    )
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#1658B0] p-2">
      <input
        autoFocus
        aria-label="Nuevo KPI"
        placeholder="+ Agregar KPI"
        value={nombre}
        disabled={enviando}
        onChange={(event) => setNombre(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void guardar()
          if (event.key === "Escape") { setAbierto(false); setNombre("") }
        }}
        className="h-8 min-w-48 flex-1 rounded border border-[#1658B0] px-2 text-sm"
      />
      <button type="button" aria-label="Guardar KPI" className="inline-flex size-8 items-center justify-center rounded-md bg-[#1658B0] text-white" onClick={() => { void guardar() }}>
        <Check />
      </button>
      <button type="button" aria-label="Cancelar KPI" className="inline-flex size-8 items-center justify-center rounded-md border border-[#E4E7EC] bg-white" onClick={() => { setAbierto(false); setNombre("") }}>
        <X />
      </button>
    </div>
  )
}

function Check() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
}

function X() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
}
