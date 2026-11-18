import { ZONE } from "@/lib/time"
import { SLA_LABEL, type SlaState, statusLabel } from "@/lib/domain"

export function formatDateTime(date: Date | null | undefined) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ZONE,
  }).format(date)
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: ZONE,
  }).format(date)
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
