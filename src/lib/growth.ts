import type { Actor } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"

export const ESTADOS_GROWTH = ["BORRADOR", "REVISION", "PREPARACION", "EN_EJECUCION", "ANALISIS", "CERRADO"] as const
export type EstadoGrowth = (typeof ESTADOS_GROWTH)[number]

export const DECISIONES = ["ADOPTAR", "ITERAR", "DESCARTAR", "INCONCLUSO"] as const
export type DecisionGrowth = (typeof DECISIONES)[number]

export const ESTADO_LABEL: Record<EstadoGrowth, string> = {
  BORRADOR: "Borrador",
  REVISION: "Revisión del equipo",
  PREPARACION: "Preparación",
  EN_EJECUCION: "En ejecución",
  ANALISIS: "Análisis",
  CERRADO: "Cerrado",
}

export const DECISION_LABEL: Record<DecisionGrowth, string> = {
  ADOPTAR: "Adoptar",
  ITERAR: "Iterar",
  DESCARTAR: "Descartar",
  INCONCLUSO: "Inconcluso",
}

const SIGUIENTE: Partial<Record<EstadoGrowth, EstadoGrowth>> = {
  BORRADOR: "REVISION",
  REVISION: "PREPARACION",
  PREPARACION: "EN_EJECUCION",
  EN_EJECUCION: "ANALISIS",
  ANALISIS: "CERRADO",
}

export function puedeVerGrowth(actor: Pick<Actor, "active" | "isAdmin" | "role" | "memberships">) {
  if (!actor.active) return false
  if (actor.role === "ADMINISTRADOR" || actor.isAdmin) return true
  return actor.memberships.some((item) => item.team === "GROWTH")
}

export function puedeEditarGrowth(actor: Pick<Actor, "active" | "isAdmin" | "role" | "memberships">) {
  if (!puedeVerGrowth(actor)) return false
  if (esAdmin(actor as Actor) || actor.role === "ADMINISTRADOR") return true
  const rol = actor.memberships.find((item) => item.team === "GROWTH")?.role
  return rol === "LIDER" || rol === "AGENTE"
}

export function siguienteEstado(actual: EstadoGrowth) {
  return SIGUIENTE[actual] ?? null
}

export function puedeAvanzar(actual: EstadoGrowth, decision?: DecisionGrowth | null) {
  const destino = siguienteEstado(actual)
  if (!destino) return { ok: false as const, error: "El experimento ya está cerrado." }
  if (destino === "CERRADO" && !decision) return { ok: false as const, error: "Al cerrar, elija Adoptar, Iterar, Descartar o Inconcluso." }
  return { ok: true as const, destino }
}

export type EtapaEmbudo = {
  nombre: string
  valor: number
  orden: number
  destacado?: boolean
  llamada?: string
  subllamada?: string
  valorPrevio?: number | null
}

function normalizarEtapa(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

const ALIAS_ETAPA: Record<string, string[]> = {
  consultas: ["consulta"],
  "valoraciones agendadas": ["agendamiento", "agenda", "valoracion"],
  asistencias: ["asistencia"],
  compras: ["compra", "conversion", "matricula"],
  recompras: ["recompra"],
}

export function etapaCoincide(nombreEtapa: string, etapaExperimento: string) {
  const etapa = normalizarEtapa(nombreEtapa)
  const experimento = normalizarEtapa(etapaExperimento)
  if (!etapa || !experimento) return false
  if (etapa === experimento || etapa.startsWith(experimento) || experimento.startsWith(etapa)) return true
  const alias = ALIAS_ETAPA[etapa] ?? []
  return alias.some((item) => experimento.includes(item))
}

export function textoPorcentaje(parte: number, total: number) {
  if (total <= 0) return null
  const redondo = Math.round((parte / total) * 1000) / 10
  return `${Number.isInteger(redondo) ? redondo.toFixed(0) : redondo.toFixed(1)}%`
}

export type DesgloseEtapa = {
  nombre: string
  valor: number
  desdeAnterior: string | null
  desdeInicio: string | null
  perdidas: number | null
  valorPrevio: number | null
  delta: number | null
  deltaTexto: string | null
}

export function desgloseEtapa(etapas: EtapaEmbudo[], index: number): DesgloseEtapa | null {
  const actual = etapas[index]
  if (!actual) return null
  const anterior = index > 0 ? etapas[index - 1] : null
  const inicio = etapas[0]
  const previo = actual.valorPrevio ?? null
  const delta = previo == null ? null : actual.valor - previo
  return {
    nombre: actual.nombre,
    valor: actual.valor,
    desdeAnterior: anterior ? textoPorcentaje(actual.valor, anterior.valor) : null,
    desdeInicio: inicio ? textoPorcentaje(actual.valor, inicio.valor) : null,
    perdidas: anterior ? anterior.valor - actual.valor : null,
    valorPrevio: previo,
    delta,
    deltaTexto: delta == null || previo == null ? null : textoPorcentaje(Math.abs(delta), previo),
  }
}

export type LecturaEmbudo = {
  fuente: "MANUAL" | "CRM"
  updatedAt: Date
  etapas: EtapaEmbudo[]
}

export interface FuenteEmbudo {
  id: "MANUAL" | "CRM"
  leer(): Promise<LecturaEmbudo | null>
}

export function fuenteManual(lectura: LecturaEmbudo | null): FuenteEmbudo {
  return { id: "MANUAL", leer: async () => lectura }
}

export function fuenteCrm(): FuenteEmbudo {
  return {
    id: "CRM",
    leer: async () => {
      throw new Error("El CRM todavía no está conectado. El embudo sigue en entrada manual.")
    },
  }
}

export function elegirFuente(preferida: "MANUAL" | "CRM", manual: LecturaEmbudo | null): FuenteEmbudo {
  return preferida === "CRM" ? fuenteCrm() : fuenteManual(manual)
}
