"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarIcon, Columns3Icon, FileTextIcon, LayoutGridIcon, ListIcon, PaperclipIcon, StickyNoteIcon } from "lucide-react"

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutGridIcon },
  { id: "tablero", label: "Tablero", icon: Columns3Icon },
  { id: "lista", label: "Lista", icon: ListIcon },
  { id: "formularios", label: "Formularios", icon: FileTextIcon },
  { id: "paginas", label: "Páginas", icon: StickyNoteIcon },
  { id: "adjuntos", label: "Adjuntos", icon: PaperclipIcon },
  { id: "calendario", label: "Calendario", icon: CalendarIcon },
]

export function PestanasEspacio({ id }: { id: string }) {
  const path = usePathname()
  const actual = path.endsWith(`/espacios/${id}`) ? "resumen" : TABS.find((tab) => path.includes(`/${tab.id}`))?.id ?? "resumen"
  return (
    <nav aria-label="Vistas del espacio" className="flex gap-1 overflow-x-auto border-b border-[#dfe1e6]">
      {TABS.map((tab) => {
        const href = tab.id === "resumen"
          ? `/espacios/${id}`
          : `/espacios/${id}/${tab.id}`
        const Icon = tab.icon
        const activo = actual === tab.id
        return (
          <Link key={tab.id} href={href} className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${activo ? "border-[#1658B0] font-medium text-[#1658B0]" : "border-transparent text-[#44546f] hover:text-[#15122A]"}`} aria-current={activo ? "page" : undefined}>
            <Icon className="size-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
