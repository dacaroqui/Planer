"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { publicarComposicion } from "@/components/compositor-envio"
import { adjuntarAction, comentarAction } from "@/server/actions"

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
}: {
  code: string
  puedePublica: boolean
  puedeNota: boolean
  puedeAdjuntar: boolean
  tareas: { id: string; title: string }[]
}) {
  const router = useRouter()
  const disponibles = TABS.filter((tab) => tab.id === "PUBLICA" ? puedePublica : puedeNota)
  const [tab, setTab] = useState<Kind>(disponibles[0]?.id ?? "PUBLICA")
  const [pending, start] = useTransition()
  if (disponibles.length === 0) return <p className="text-sm text-muted-foreground">Su perfil solo puede leer esta solicitud.</p>
  return (
    <form className="rounded-xl border border-[#E4E7EC] bg-white p-4" onSubmit={(event) => {
      event.preventDefault()
      const form = event.currentTarget
      const data = new FormData(form)
      data.set("code", code)
      data.set("kind", tab)
      start(() => publicarComposicion({
        form,
        data,
        adjuntar: adjuntarAction,
        comentar: comentarAction,
        avisar: (tipo, texto) => tipo === "ok" ? toast.success(texto) : toast.error(texto),
        refrescar: () => router.refresh(),
      }))
    }}>
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {disponibles.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "rounded-full bg-[#E7F0FB] px-3 py-1 text-sm font-medium text-[#1658B0]" : "rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-[#F3F4F6]"} onClick={() => setTab(item.id)}>
            {item.etiqueta}
          </button>
        ))}
      </div>
      <textarea name="body" required minLength={2} rows={3} placeholder={tab === "SOLICITUD_INFO" ? "Qué necesita del solicitante. Esto pausa el SLA." : tab === "REGISTRO" ? "Qué hizo en la tarea." : tab === "INTERNA" ? "Nota visible solo para el equipo." : "Respuesta para el solicitante."} className="w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-sm" />
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
      {puedeAdjuntar ? <input name="archivo" type="file" className="mt-3 block w-full text-sm" aria-label="Adjuntar archivo" /> : null}
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={pending} className="h-10 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Publicando…" : tab === "SOLICITUD_INFO" ? "Pedir información" : "Publicar"}
        </button>
      </div>
    </form>
  )
}
