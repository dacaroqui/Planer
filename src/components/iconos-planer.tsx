import { BugIcon, CheckSquareIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpIcon, CornerDownRightIcon, EqualIcon, ImageIcon, SquareIcon } from "lucide-react"
import { iconoPrioridad, iconoTipo, iniciales } from "@/lib/planer-ui"
import { PRIORITY_LABEL, type PriorityName } from "@/lib/domain"
import { cn } from "@/lib/utils"

export function IconoTipo({ nombre, subtarea = false, className }: { nombre: string; subtarea?: boolean; className?: string }) {
  const tipo = iconoTipo(nombre, subtarea)
  const clase = cn("size-4 shrink-0", className)
  if (tipo === "error") return <BugIcon className={cn(clase, "text-[#9f1239]")} aria-hidden />
  if (tipo === "pieza") return <ImageIcon className={cn(clase, "text-[#EE876B]")} aria-hidden />
  if (tipo === "subtarea") return <CornerDownRightIcon className={cn(clase, "text-[#4FB3DB]")} aria-hidden />
  if (tipo === "tarea") return <CheckSquareIcon className={cn(clase, "text-[#1658B0]")} aria-hidden />
  return <SquareIcon className={cn(clase, "text-[#1658B0]")} aria-hidden />
}

export function IconoPrioridad({ prioridad }: { prioridad: string }) {
  const tipo = iconoPrioridad(prioridad)
  const etiqueta = PRIORITY_LABEL[prioridad as PriorityName] ?? prioridad
  if (tipo === "critica") return <span title={etiqueta} aria-label={etiqueta}><ChevronsUpIcon className="size-4 text-[#9f1239]" /></span>
  if (tipo === "alta") return <span title={etiqueta} aria-label={etiqueta}><ChevronUpIcon className="size-4 text-[#c2410c]" /></span>
  if (tipo === "baja") return <span title={etiqueta} aria-label={etiqueta}><ChevronDownIcon className="size-4 text-[#4FB3DB]" /></span>
  return <span title={etiqueta} aria-label={etiqueta}><EqualIcon className="size-4 text-[#8B8C8C]" /></span>
}

export function Avatar({ nombre, marca = "CIFES" }: { nombre: string; marca?: string }) {
  const luvania = marca === "LUVANIA"
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{ background: luvania ? "#EE876B" : "#1658B0", color: "#ffffff" }}
      title={nombre}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  )
}
