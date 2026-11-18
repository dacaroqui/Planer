"use client"

import { useState, useTransition, type ClipboardEvent, type DragEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { publicarComposicion } from "@/components/compositor-envio"
import { pestanasPara } from "@/lib/cronologia"
import { comentarAction } from "@/server/actions"

const TABS = [
  { id: "PUBLICA", etiqueta: "Responder al solicitante" },
  { id: "INTERNA", etiqueta: "Nota interna" },
  { id: "REGISTRO", etiqueta: "Registrar trabajo" },
  { id: "SOLICITUD_INFO", etiqueta: "Pedir información" },
] as const

type Kind = (typeof TABS)[number]["id"]

export function Compositor({
  code,
  puedePublica,
  puedeNota,
  puedeAdjuntar,
  tareas,
  esSolicitante = false,
}: {
  code: string
  puedePublica: boolean
  puedeNota: boolean
  puedeAdjuntar: boolean
  tareas: { id: string; title: string }[]
  esSolicitante?: boolean
}) {
  const router = useRouter()
  const permitidas = new Set(pestanasPara({ esSolicitante, puedePublica, puedeNota }))
  const disponibles = TABS.filter((tab) => permitidas.has(tab.id)).map((tab) => (
    esSolicitante && tab.id === "PUBLICA" ? { ...tab, etiqueta: "Comentar" as const } : tab
  ))
  const [tab, setTab] = useState<Kind>(disponibles[0]?.id ?? "PUBLICA")
  const [archivos, setArchivos] = useState<File[]>([])
  const [soltando, setSoltando] = useState(false)
  const [pending, start] = useTransition()
  function sumarArchivos(lista: File[]) {
    const utiles = lista.filter((archivo) => archivo.size > 0)
    if (utiles.length === 0) return
    setArchivos((prev) => [...prev, ...utiles].slice(0, 8))
  }
  function pegar(event: ClipboardEvent<HTMLElement>) {
    const pegados = [...event.clipboardData.files]
    if (pegados.length === 0) return
    event.preventDefault()
    sumarArchivos(pegados.map((archivo, indice) => archivo.name ? archivo : new File([archivo], `captura-${Date.now()}-${indice}.png`, { type: archivo.type || "image/png" })))
  }
  function soltar(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setSoltando(false)
    sumarArchivos([...event.dataTransfer.files])
  }
  if (disponibles.length === 0) return <p className="text-sm text-muted-foreground">Su perfil solo puede leer esta solicitud.</p>
  return (
    <form className="rounded-xl border border-[#E4E7EC] bg-white p-4" onSubmit={(event) => {
      event.preventDefault()
      const form = event.currentTarget
      const data = new FormData(form)
      data.set("code", code)
      data.set("kind", tab)
      for (const archivo of archivos) data.append("archivo", archivo)
      start(async () => {
        const ok = await publicarComposicion({
          form,
          data,
          comentar: comentarAction,
          avisar: (tipo, texto) => tipo === "ok" ? toast.success(texto) : toast.error(texto),
          refrescar: () => router.refresh(),
        })
        if (ok) setArchivos([])
      })
    }}>
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {disponibles.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "rounded-full bg-[#E7F0FB] px-3 py-1 text-sm font-medium text-[#1658B0]" : "rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-[#F3F4F6]"} onClick={() => setTab(item.id)}>
            {item.etiqueta}
          </button>
        ))}
      </div>
      <textarea name="body" required minLength={2} rows={3} onPaste={pegar} placeholder={tab === "SOLICITUD_INFO" ? "Qué necesita del solicitante. Esto pausa el SLA." : tab === "REGISTRO" ? "Qué hizo en la tarea." : tab === "INTERNA" ? "Nota visible solo para el equipo." : esSolicitante ? "Escriba su comentario." : "Respuesta para el solicitante."} className="w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-sm" />
      {tab === "REGISTRO" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Minutos
            <input name="minutes" type="number" min={1} required defaultValue={30} className="h-10 rounded-lg border border-[#E4E7EC] px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Tarea
            <select name="tareaId" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3" defaultValue={tareas[0]?.id ?? ""}>
              <option value="">Sin tarea</option>
              {tareas.map((tarea) => <option key={tarea.id} value={tarea.id}>{tarea.title}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="compartir" value="1" /> Compartir con el solicitante al entregar
          </label>
        </div>
      ) : null}
      {puedeAdjuntar ? (
        <div
          className={soltando ? "mt-3 rounded-lg border border-dashed border-[#1658B0] bg-[#F4F8FE] px-3 py-3 text-sm" : "mt-3 rounded-lg border border-dashed border-[#D9DEE7] px-3 py-3 text-sm"}
          onDragOver={(event) => { event.preventDefault(); setSoltando(true) }}
          onDragLeave={() => setSoltando(false)}
          onDrop={soltar}
          onPaste={pegar}
        >
          <label className="block cursor-pointer text-muted-foreground">
            Suelte archivos aquí, péguelos con Ctrl+V o <span className="font-medium text-[#1658B0]">elija varios</span>. Imágenes, PDF y documentos de Office, hasta 25 MB cada uno.
            <input name="selector-archivos" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" className="sr-only" aria-label="Adjuntar archivos" onChange={(event) => { sumarArchivos([...(event.target.files ?? [])]); event.target.value = "" }} />
          </label>
          {archivos.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {archivos.map((archivo, indice) => (
                <li key={`${archivo.name}-${indice}`} className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-2 py-1 text-xs">
                  {archivo.name}
                  <button type="button" aria-label={`Quitar ${archivo.name}`} className="text-muted-foreground" onClick={() => setArchivos((prev) => prev.filter((_, item) => item !== indice))}>×</button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={pending} className="h-10 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Publicando…" : tab === "SOLICITUD_INFO" ? "Pedir información" : "Publicar"}
        </button>
      </div>
    </form>
  )
}
