"use client"

import { useState } from "react"
import Link from "next/link"
import { Maximize2Icon, MoreHorizontalIcon, Share2Icon, UserPlusIcon } from "lucide-react"
import { PestanasEspacio } from "@/components/pestanas-espacio"
import { toast } from "sonner"

export function MarcoEspacio({
  id,
  nombre,
  luvania,
  children,
}: {
  id: string
  nombre: string
  luvania: boolean
  children: React.ReactNode
}) {
  const [menu, setMenu] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-[#dfe1e6] bg-white">
      <header className="flex items-center gap-2 px-4 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded text-sm font-semibold text-white" style={{ background: luvania ? "#EE876B" : "#1658B0" }}>{nombre.slice(0, 1)}</span>
        <h1 className="text-xl font-semibold">{nombre}</h1>
        <Link href="/admin/usuarios" className="inline-flex size-8 items-center justify-center rounded hover:bg-[#F4F5F7]" aria-label="Agregar personas"><UserPlusIcon className="size-4" /></Link>
        <button type="button" className="inline-flex size-8 items-center justify-center rounded hover:bg-[#F4F5F7]" aria-label="Menú del espacio" aria-expanded={menu} onClick={() => setMenu((valor) => !valor)}>
          <MoreHorizontalIcon className="size-4" />
        </button>
        {menu ? (
          <div className="rounded-md border border-[#dfe1e6] bg-white p-1 text-sm shadow-md">
            <Link href={`/requerimientos?empresa=${id}`} className="block rounded px-3 py-1.5 hover:bg-[#F4F5F7]" onClick={() => setMenu(false)}>Abrir la lista</Link>
            <Link href={`/espacios/${id}/formularios`} className="block rounded px-3 py-1.5 hover:bg-[#F4F5F7]" onClick={() => setMenu(false)}>Radicar</Link>
          </div>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          <button type="button" className="inline-flex size-8 items-center justify-center rounded hover:bg-[#F4F5F7]" aria-label="Compartir" onClick={() => { void navigator.clipboard.writeText(window.location.href); toast.success("Enlace del espacio copiado.") }}>
            <Share2Icon className="size-4" />
          </button>
          <button type="button" className="inline-flex size-8 items-center justify-center rounded hover:bg-[#F4F5F7]" aria-label="Ampliar" onClick={() => document.getElementById("espacio-contenido")?.requestFullscreen?.()}>
            <Maximize2Icon className="size-4" />
          </button>
        </span>
      </header>
      <div className="px-2">
        <PestanasEspacio id={id} />
      </div>
      <div id="espacio-contenido" className="bg-[#f7f8f9] p-3">{children}</div>
    </div>
  )
}
