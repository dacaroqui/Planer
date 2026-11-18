import { statusLabel } from "@/lib/domain"
import { etapaDeEstado, type IdEtapa } from "@/lib/seguimiento"

export type PasoMovimiento = {
  name: string
  to: string
  roles: Array<"LIDER" | "RESPONSABLE" | "SOLICITANTE" | "QA">
  toPrevious?: boolean
  requiresComment?: boolean
  requiresDelivery?: boolean
  requiresAssignee?: boolean
  requiresCommittedDate?: boolean
}

export function destinoEtapa(item: PasoMovimiento, anterior: string | null) {
  if (item.toPrevious) return etapaDeEstado(anterior || "NUEVO")
  return etapaDeEstado(item.to)
}

export function motivoRol(roles: PasoMovimiento["roles"]) {
  const unicos = [...new Set(roles)]
  if (unicos.length === 1 && unicos[0] === "LIDER") return "Solo el líder puede…"
  if (unicos.length === 1 && unicos[0] === "RESPONSABLE") return "Solo el responsable puede…"
  if (unicos.length === 1 && unicos[0] === "SOLICITANTE") return "Solo el solicitante puede…"
  if (unicos.length === 1 && unicos[0] === "QA") return "Solo quien revisa las pruebas puede…"
  if (unicos.includes("LIDER") && unicos.includes("RESPONSABLE") && !unicos.includes("SOLICITANTE")) return "Solo el líder o el responsable pueden…"
  if (unicos.includes("SOLICITANTE")) return "Solo el solicitante o el líder pueden…"
  return "Su rol no puede hacer este paso."
}

export function clasificarEtapas(input: {
  status: string
  anterior?: string | null
  etapas: { id: IdEtapa; label: string }[]
  permitidas: PasoMovimiento[]
  catalogo: PasoMovimiento[]
}) {
  const anterior = input.anterior ?? null
  return input.etapas.map((etapa) => {
    const esActual = etapaDeEstado(input.status) === etapa.id
    const permitidas = input.permitidas.filter((item) => {
      if (destinoEtapa(item, anterior) !== etapa.id) return false
      if (esActual && !item.toPrevious && item.to === input.status) return false
      return true
    })
    if (permitidas.length > 0) return { id: etapa.id, permitidas, motivo: null as string | null }
    if (esActual) return { id: etapa.id, permitidas: [] as PasoMovimiento[], motivo: "Es el estado actual." }
    const bloqueadas = input.catalogo.filter((item) => destinoEtapa(item, anterior) === etapa.id)
    if (bloqueadas.length > 0) {
      return { id: etapa.id, permitidas: [] as PasoMovimiento[], motivo: motivoRol(bloqueadas.flatMap((item) => item.roles)) }
    }
    return {
      id: etapa.id,
      permitidas: [] as PasoMovimiento[],
      motivo: `Desde ${statusLabel(input.status)} no hay un paso directo a ${etapa.label}.`,
    }
  })
}
