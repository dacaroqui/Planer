import { ZONE } from "@/lib/time"
import { SLA_LABEL, type SlaState, statusLabel } from "@/lib/domain"

function parte(date: Date, tipo: Intl.DateTimeFormatPartTypes, opciones: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...opciones, timeZone: ZONE })
    .formatToParts(date)
    .find((item) => item.type === tipo)?.value ?? ""
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) return "—"
  const opciones: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }
  return `${parte(date, "day", opciones)}/${parte(date, "month", opciones)}/${parte(date, "year", opciones)} ${parte(date, "hour", opciones)}:${parte(date, "minute", opciones)}`
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—"
  const opciones: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" }
  return `${parte(date, "day", opciones)}/${parte(date, "month", opciones)}/${parte(date, "year", opciones)}`
}

export function formatoNumero(valor: number, maxDecimales = 0) {
  const negativo = valor < 0
  const factor = 10 ** maxDecimales
  const redondeado = Math.round((Math.abs(valor) + Number.EPSILON) * factor) / factor
  const [entero, frac = ""] = redondeado.toFixed(maxDecimales).split(".")
  const recortado = frac.replace(/0+$/, "")
  const grupos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const cuerpo = recortado ? `${grupos},${recortado}` : grupos
  return negativo ? `-${cuerpo}` : cuerpo
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function slaClass(state: SlaState) {
  switch (state) {
    case "A_TIEMPO":
    case "CUMPLIDO":
      return "bg-emerald-100 text-emerald-950"
    case "EN_RIESGO":
    case "EN_PAUSA":
      return "bg-amber-100 text-amber-950"
    case "VENCIDO":
    case "INCUMPLIDO":
      return "bg-red-100 text-red-950"
    default:
      return "bg-stone-200 text-stone-700"
  }
}

export function statusClass(status: string) {
  if (status === "CERRADO" || status === "RESUELTO" || status === "ENTREGADO") return "bg-emerald-100 text-emerald-800"
  if (status === "CANCELADO" || status === "RECHAZADO" || status === "NUEVO" || status === "APROBADO") return "bg-[#EEF2F6] text-[#3d4a63]"
  if (status === "EN_DESARROLLO" || status === "EN_PRUEBAS" || status === "EN_PRODUCCION" || status === "PROGRAMADO") {
    return "bg-[#E7F0FB] text-[#1658B0]"
  }
  if (status === "BLOQUEADO") return "bg-red-100 text-red-800"
  return "bg-[#FEF3C7] text-[#92400E]"
}

export function slaText(state: SlaState) {
  return SLA_LABEL[state]
}

export function statusText(status: string) {
  return statusLabel(status)
}
