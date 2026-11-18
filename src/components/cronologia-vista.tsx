"use client"

import { useState } from "react"
import { LockIcon } from "lucide-react"
import { formatDateTime } from "@/lib/format"
import { esImagenAdjunto } from "@/lib/cronologia"

export type AdjuntoLinea = { id: string; filename: string; mimeType: string }

export type EntradaLinea =
  | { tipo: "publica" | "interna" | "registro" | "info"; id: string; autor: string; cuando: string; cuerpo: string; minutos: number | null; tarea: string | null; adjuntos?: AdjuntoLinea[] }
  | { tipo: "estado"; id: string; cuando: string; texto: string }

export function Cronologia({ entradas }: { entradas: EntradaLinea[] }) {
  const [luz, setLuz] = useState<AdjuntoLinea | null>(null)
  if (entradas.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay actividad.</p>
  return (
    <>
      <ol className="grid gap-3">
        {entradas.map((entrada) => {
          if (entrada.tipo === "estado") {
            return <li key={entrada.id} className="text-xs text-muted-foreground">{formatDateTime(new Date(entrada.cuando))} · {entrada.texto}</li>
          }
          if (entrada.tipo === "registro") {
            return (
              <li key={entrada.id} className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-sm">
                <p className="font-medium">{entrada.autor} · {entrada.minutos ?? 0} min{entrada.tarea ? ` · ${entrada.tarea}` : ""}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{entrada.cuerpo}</p>
                <Adjuntos entrada={entrada} onAbrir={setLuz} />
              </li>
            )
          }
          const interna = entrada.tipo === "interna"
          return (
            <li key={entrada.id} className={interna ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm" : "rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-sm"}>
              <p className="font-medium">
                {interna ? <LockIcon className="mr-1 inline size-3.5" aria-label="Nota interna" /> : null}
                {entrada.autor}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{formatDateTime(new Date(entrada.cuando))}{entrada.tipo === "info" ? " · Pidió información" : interna ? " · Nota interna" : ""}</span>
              </p>
              <p className="mt-2 whitespace-pre-wrap">{entrada.cuerpo}</p>
              <Adjuntos entrada={entrada} onAbrir={setLuz} />
            </li>
          )
        })}
      </ol>
      {luz ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15122A]/70 p-4" role="dialog" aria-modal="true" aria-label={luz.filename} onClick={() => setLuz(null)}>
          <img src={`/api/adjuntos/${luz.id}`} alt={luz.filename} className="max-h-[85vh] max-w-full rounded-lg bg-white" />
        </div>
      ) : null}
    </>
  )
}

function Adjuntos({ entrada, onAbrir }: { entrada: Extract<EntradaLinea, { tipo: "publica" | "interna" | "registro" | "info" }>; onAbrir: (archivo: AdjuntoLinea) => void }) {
  const archivos = entrada.adjuntos ?? []
  if (archivos.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {archivos.map((archivo) => esImagenAdjunto(archivo.mimeType, archivo.filename) ? (
        <li key={archivo.id}>
          <button type="button" className="block overflow-hidden rounded-lg border border-[#E4E7EC]" onClick={() => onAbrir(archivo)} aria-label={`Abrir ${archivo.filename}`}>
            <img src={`/api/adjuntos/${archivo.id}`} alt="" className="h-20 w-20 object-cover" />
          </button>
        </li>
      ) : (
        <li key={archivo.id}>
          <a href={`/api/adjuntos/${archivo.id}`} className="inline-flex rounded-full border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs font-medium text-[#1658B0] hover:underline">{archivo.filename}</a>
        </li>
      ))}
    </ul>
  )
}

export function hace(iso: string | null, ahora = Date.now()) {
  if (!iso) return "sin actividad pública"
  const minutos = Math.round((ahora - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return "ahora"
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.round(horas / 24)} d`
}
