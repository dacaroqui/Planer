import type { Actor, TeamName } from "@/lib/domain"
import { TEAMS, TEAM_LABEL } from "@/lib/domain"
import { esAdmin, rolEn } from "@/lib/permissions"

export const MARCAS = ["CIFES", "LUVANIA", "AMBAS"] as const
export const FRECUENCIAS = ["SEMANAL", "QUINCENAL", "MENSUAL"] as const
export const TIPOS_KPI = ["PRINCIPAL", "APOYO"] as const
export const ESTADOS_META = ["EN_LINEA_BASE", "PROPUESTA", "APROBADA"] as const
export const ESTADOS_OBJETIVO = ["ABIERTO", "EN_CURSO", "CERRADO"] as const

export const FRECUENCIA_LABEL = { SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual" }
export const TIPO_KPI_LABEL = { PRINCIPAL: "Principal", APOYO: "Apoyo" }
export const META_LABEL = { EN_LINEA_BASE: "En línea base", PROPUESTA: "Propuesta", APROBADA: "Aprobada" }
export const OBJETIVO_LABEL = { ABIERTO: "Abierto", EN_CURSO: "En curso", CERRADO: "Cerrado" }
export const MARCA_LABEL = { CIFES: "CIFES", LUVANIA: "Luvania", AMBAS: "Ambas" }

export const FASES_POR_AREA: Record<TeamName, string[]> = {
  MARKETING: ["Orgánico", "Fase 0", "Fase 1", "Fase 2", "Fase 3", "Fase 4"],
  DESARROLLO: ["Definición", "Desarrollo", "Pruebas", "Salida"],
  GROWTH: ["Consultas", "Valoraciones agendadas", "Asistencias", "Compras", "Recompras"],
  COMERCIAL: ["Planeación", "Ejecución", "Cierre"],
  INNOVACION: ["Planeación", "Ejecución", "Cierre"],
  ADMINISTRACION: ["Planeación", "Ejecución", "Cierre"],
}

export function puedeVerMatriz(actor: Pick<Actor, "active" | "isAdmin" | "memberships">) {
  if (!actor.active) return false
  if (esAdmin(actor as Actor)) return true
  return actor.memberships.some((item) => item.role === "LIDER" || item.role === "AGENTE")
}

export function puedeEditarArea(actor: Pick<Actor, "active" | "isAdmin" | "memberships">, area: TeamName) {
  if (!actor.active) return false
  if (esAdmin(actor as Actor)) return true
  return rolEn(actor as Actor, area) === "LIDER"
}

export function puedeAprobarMeta(actor: Pick<Actor, "active" | "isAdmin">) {
  return esAdmin(actor as Actor)
}

export function mensajeCupo(existentes: { id?: string; tipo: "PRINCIPAL" | "APOYO" }[], tipo: "PRINCIPAL" | "APOYO", idExcluir?: string) {
  const otros = existentes.filter((item) => !idExcluir || item.id !== idExcluir)
  const principales = otros.filter((item) => item.tipo === "PRINCIPAL").length + (tipo === "PRINCIPAL" ? 1 : 0)
  const apoyo = otros.filter((item) => item.tipo === "APOYO").length + (tipo === "APOYO" ? 1 : 0)
  if (principales > 1) return "Cada persona tiene un solo KPI principal."
  if (apoyo > 4) return "Cada persona tiene como máximo cuatro KPIs de apoyo."
  return null
}

export function puedeProponerMeta(mediciones: number) {
  return mediciones >= 3
}

export type Pieza = { horas: number; costo: number }

export function sumarPiezas(piezas: Pieza[]): Pieza {
  return piezas.reduce((total, pieza) => ({ horas: total.horas + pieza.horas, costo: total.costo + pieza.costo }), { horas: 0, costo: 0 })
}

export function excedeTope(costo: number, tope: number | null) {
  return tope != null && costo > tope
}

export function diasEntre(inicio: string | null, fin: string | null) {
  if (!inicio || !fin) return ""
  const ms = new Date(fin).getTime() - new Date(inicio).getTime()
  if (!Number.isFinite(ms)) return ""
  return String(Math.max(0, Math.round(ms / 86_400_000)))
}

export function numero(valor: { toString(): string } | number | null | undefined) {
  if (valor == null || valor === "") return 0
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

export function areasVisibles(actor: Pick<Actor, "active" | "isAdmin" | "memberships">) {
  if (esAdmin(actor as Actor)) return [...TEAMS]
  return [...new Set(actor.memberships.map((item) => item.team))]
}

export { TEAM_LABEL, TEAMS }
