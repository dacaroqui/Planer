import Link from "next/link"

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "tablero", label: "Tablero" },
  { id: "lista", label: "Lista" },
  { id: "calendario", label: "Calendario" },
  { id: "cronograma", label: "Cronograma" },
  { id: "aprobaciones", label: "Aprobaciones" },
]

export function PestanasEspacio({ id, actual }: { id: string; actual: string }) {
  return (
    <nav aria-label="Vistas del espacio" className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = tab.id === "resumen"
          ? `/espacios/${id}`
          : tab.id === "tablero"
            ? `/tablero?empresa=${id}`
            : tab.id === "lista"
              ? `/requerimientos?empresa=${id}`
              : `/espacios/${id}/${tab.id}`
        const activo = actual === tab.id
        return (
          <Link key={tab.id} href={href} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${activo ? "border-[#1658B0] font-medium text-[#1658B0]" : "border-transparent text-muted-foreground hover:text-foreground"}`} aria-current={activo ? "page" : undefined}>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
