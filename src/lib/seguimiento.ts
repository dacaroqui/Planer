import { statusLabel } from "@/lib/domain"

export const ORDEN_ETAPAS = ["radicado", "analisis", "espera", "desarrollo", "revision", "hecho"] as const
export type IdEtapa = (typeof ORDEN_ETAPAS)[number]

const ETIQUETA: Record<IdEtapa, string> = {
  radicado: "Radicado",
  analisis: "En análisis",
  espera: "En espera de información",
  desarrollo: "En desarrollo",
  revision: "En revisión",
  hecho: "Hecho",
}

const MAPA: Record<string, IdEtapa> = {
  NUEVO: "radicado",
  EN_ANALISIS: "analisis",
  EN_REVISION_BRIEF: "analisis",
  APROBADO: "desarrollo",
  EN_ESPERA: "espera",
  EN_DESARROLLO: "desarrollo",
  EN_CURSO: "desarrollo",
  EN_REVISION: "revision",
  HECHO: "hecho",
  BLOQUEADO: "desarrollo",
  EN_PRODUCCION: "desarrollo",
  EN_PRUEBAS: "revision",
  EN_VALIDACION: "revision",
  EN_REVISION_INTERNA: "revision",
  EN_APROBACION: "revision",
  PROGRAMADO: "revision",
  CERRADO: "hecho",
  RECHAZADO: "hecho",
  CANCELADO: "hecho",
}

export type EtapaVista = {
  id: IdEtapa
  label: string
  estado: "pendiente" | "actual" | "hecha"
  fecha: string | null
  estadoReal: string | null
}

export function etapaDeEstado(status: string): IdEtapa {
  return MAPA[status] ?? "radicado"
}

export function armarEtapas(input: {
  status: string
  createdAt: Date
  updatedAt: Date
  cambios: { toValue: string | null; createdAt: Date }[]
}): EtapaVista[] {
  const visitas = new Map<IdEtapa, Date>()
  visitas.set("radicado", input.createdAt)
  for (const cambio of input.cambios) {
    if (!cambio.toValue) continue
    const etapa = etapaDeEstado(cambio.toValue)
    const previa = visitas.get(etapa)
    if (!previa || cambio.createdAt.getTime() >= previa.getTime()) visitas.set(etapa, cambio.createdAt)
  }
  const actual = etapaDeEstado(input.status)
  if (!visitas.has(actual)) visitas.set(actual, input.updatedAt)
  const incluirEspera = actual === "espera" || input.cambios.some((cambio) => cambio.toValue === "EN_ESPERA")
  const ids = ORDEN_ETAPAS.filter((id) => id !== "espera" || incluirEspera)
  const indiceActual = ids.indexOf(actual)
  return ids.map((id) => {
    let label = ETIQUETA[id]
    if (id === "hecho" && input.status === "RECHAZADO") label = "Rechazado"
    if (id === "hecho" && input.status === "CANCELADO") label = "Cancelado"
    const indice = ids.indexOf(id)
    const estado = id === actual ? "actual" : visitas.has(id) || indice < indiceActual ? "hecha" : "pendiente"
    const fecha = estado === "pendiente" ? null : visitas.get(id) ?? null
    return {
      id,
      label,
      estado,
      fecha: fecha ? fecha.toISOString() : null,
      estadoReal: id === actual ? statusLabel(input.status) : null,
    }
  })
}

export function pasoEsperado(status: string) {
  if (status === "EN_ESPERA") {
    return { texto: "El equipo necesita información suya para continuar.", cta: "Responder y continuar" }
  }
  if (status === "EN_VALIDACION") {
    return { texto: "La entrega está lista. Apruebe o pida un ajuste.", cta: "Revisar la entrega" }
  }
  if (status === "EN_APROBACION") {
    return { texto: "La pieza está lista para su aprobación.", cta: "Revisar la pieza" }
  }
  if (status === "NUEVO") return { texto: "El líder del área todavía no inicia el análisis.", cta: null }
  if (status === "EN_ANALISIS" || status === "EN_REVISION_BRIEF") return { texto: "El equipo está revisando el pedido.", cta: null }
  if (status === "APROBADO") return { texto: "Quedó aprobado y está en cola para empezar.", cta: null }
  if (status === "EN_DESARROLLO" || status === "EN_PRODUCCION" || status === "BLOQUEADO") {
    return { texto: status === "BLOQUEADO" ? "El trabajo está bloqueado. El equipo sigue a cargo." : "El equipo está trabajando en la solicitud.", cta: null }
  }
  if (status === "EN_PRUEBAS" || status === "EN_REVISION_INTERNA") return { texto: "Está en revisión del equipo.", cta: null }
  if (status === "PROGRAMADO") return { texto: "Quedó programado o publicado. El cierre es el siguiente paso.", cta: null }
  if (status === "CERRADO") return { texto: "La solicitud está cerrada.", cta: null }
  if (status === "RECHAZADO") return { texto: "El equipo no continuará con esta solicitud.", cta: null }
  if (status === "CANCELADO") return { texto: "Esta solicitud fue cancelada.", cta: null }
  return { texto: "Siga el estado en el detalle.", cta: null }
}
