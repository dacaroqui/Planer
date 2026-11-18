"use client"

import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react"
import { UploadIcon, XIcon } from "lucide-react"
import { piezaDeArchivo, quitarArchivo, type PiezaArchivo } from "@/lib/archivos-zona"
import { TIPOS_PERMITIDOS } from "@/lib/archivos-permitidos"
import { formatBytes } from "@/lib/format"

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip"

export function FileDropzone({
  piezas,
  archivos,
  onChange,
  disabled = false,
  compacto = false,
}: {
  piezas: PiezaArchivo[]
  archivos: File[]
  onChange: (piezas: PiezaArchivo[], archivos: File[]) => void
  disabled?: boolean
  compacto?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sobre, setSobre] = useState(false)

  function publicar(lista: File[]) {
    const unidas = [...archivos, ...lista].slice(0, 8)
    onChange(unidas.map((archivo, indice) => piezaDeArchivo(archivo, `${archivo.name}-${indice}`)), unidas)
    if (inputRef.current) inputRef.current.value = ""
  }

  function quitar(id: string) {
    const indice = piezas.findIndex((item) => item.id === id)
    const siguientes = quitarArchivo(piezas, id)
    onChange(siguientes, archivos.filter((_, item) => item !== indice))
    if (inputRef.current) inputRef.current.value = ""
  }

  function pegar(event: ClipboardEvent<HTMLElement>) {
    if (disabled) return
    const pegados = [...event.clipboardData.files]
    if (pegados.length === 0) return
    event.preventDefault()
    publicar(pegados.map((archivo, indice) => archivo.name ? archivo : new File([archivo], `captura-${Date.now()}-${indice}.png`, { type: archivo.type || "image/png" })))
  }

  function soltar(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setSobre(false)
    if (disabled) return
    publicar([...event.dataTransfer.files])
  }

  function tecla(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div className="grid gap-2">
      {compacto ? null : (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Adjuntar archivos"
        onKeyDown={tecla}
        onClick={() => { if (!disabled) inputRef.current?.click() }}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setSobre(true) }}
        onDragLeave={() => setSobre(false)}
        onDrop={soltar}
        onPaste={pegar}
        className={sobre
          ? "rounded-lg border border-dashed border-[#1658B0] bg-[#F4F8FE] px-4 py-5 text-center"
          : "rounded-lg border border-dashed border-[#D9DEE7] px-4 py-5 text-center"}
      >
        <UploadIcon className="mx-auto size-5 text-[#1658B0]" aria-hidden />
        <p className="mt-2 text-sm font-medium text-[#15122A]">Arrastra o elige un archivo</p>
        <p className="text-sm text-muted-foreground">o pega un pantallazo (Ctrl+V)</p>
        <p className="mt-1 text-xs text-muted-foreground">Máximo 25 MB. {TIPOS_PERMITIDOS}.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={disabled}
          className="sr-only"
          aria-label="Elegir archivos"
          onChange={(event) => { publicar([...(event.target.files ?? [])]); }}
        />
      </div>
      )}
      {piezas.length > 0 ? (
        <ul className="grid gap-2">
          {piezas.map((pieza) => (
            <li key={pieza.id} className={pieza.error ? "flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm" : "flex items-center justify-between gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-sm"}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{pieza.name}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(pieza.size)}</span>
                {pieza.error ? <span className="block text-xs text-red-800">{pieza.error}</span> : null}
              </span>
              <button type="button" aria-label={`Quitar ${pieza.name}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-[#F3F4F6]" onClick={() => quitar(pieza.id)}>
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
