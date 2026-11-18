import type { ReactNode } from "react"
import { InboxIcon } from "lucide-react"

export function EstadoVacio({
  titulo,
  texto,
  icono,
  accion,
  compacto = false,
}: {
  titulo: string
  texto?: string
  icono?: ReactNode
  accion?: ReactNode
  compacto?: boolean
}) {
  return (
    <div className={compacto
      ? "flex flex-col items-center px-4 py-8 text-center"
      : "flex flex-col items-center rounded-xl border border-[#E4E7EC] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(21,18,42,0.04)]"}>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#E7F0FB] text-[#1658B0]" aria-hidden>
        {icono ?? <InboxIcon className="size-6" />}
      </span>
      <p className="mt-3 font-heading text-base font-semibold text-[#15122A]">{titulo}</p>
      {texto ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{texto}</p> : null}
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  )
}
