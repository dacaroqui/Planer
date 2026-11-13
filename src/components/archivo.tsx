"use client"

import { useState } from "react"

export function SelectorArchivo({ name, required = false }: { name: string; required?: boolean }) {
  const [fileName, setFileName] = useState("Ningún archivo seleccionado")
  return (
    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-2 text-sm">
      <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-medium">Elegir archivo</span>
      <span className="truncate text-muted-foreground">{fileName}</span>
      <input
        name={name}
        type="file"
        required={required}
        className="sr-only"
        onChange={(event) => {
          setFileName(event.target.files?.[0]?.name || "Ningún archivo seleccionado")
        }}
      />
    </label>
  )
}
