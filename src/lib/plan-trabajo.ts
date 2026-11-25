import type { Actor, TeamName } from "@/lib/domain"
import { TEAM_LABEL, esTeam } from "@/lib/domain"
import { esAdmin, rolEn } from "@/lib/permissions"

export const ESTADOS_TAREA = ["PENDIENTE", "EN_CURSO", "HECHA"] as const
export type EstadoTareaPlan = (typeof ESTADOS_TAREA)[number]

export const ESTADO_TAREA_LABEL: Record<EstadoTareaPlan, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  HECHA: "Hecha",
}

const SIGUIENTE: Record<EstadoTareaPlan, EstadoTareaPlan[]> = {
  PENDIENTE: ["EN_CURSO"],
  EN_CURSO: ["PENDIENTE", "HECHA"],
  HECHA: ["EN_CURSO"],
}

export type TituloParseado = {
  titulo: string
  participantes: string[]
  bloqueo: string
  notaRol: string
}

export function partirParticipantes(texto: string) {
  return texto
    .split(/\s*(?:,|&| y )\s*/i)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parsearTituloPlan(title: string): TituloParseado {
  let titulo = title.trim()
  let participantes = ""
  let bloqueo = ""
  let notaRol = ""
  const marca = /^(.*)(?:\s+[—–-]\s+)(Participantes|Bloqueo|Rol en Excel):\s*(.*)$/i
  for (let paso = 0; paso < 8; paso += 1) {
    const match = titulo.match(marca)
    if (!match) break
    titulo = match[1].trim()
    const campo = match[2].toLowerCase()
    const valor = match[3].trim()
    if (campo.startsWith("participante")) participantes = valor
    else if (campo.startsWith("bloqueo")) bloqueo = valor
    else notaRol = valor
  }
  return {
    titulo: titulo || title.trim(),
    participantes: partirParticipantes(participantes),
    bloqueo,
    notaRol,
  }
}

export function puedeEditarPlan(actor: Pick<Actor, "active" | "isAdmin" | "role" | "memberships">, team: string | null) {
  if (!actor.active) return false
  if (esAdmin(actor as Actor)) return true
  if (!team || !esTeam(team)) return false
  return rolEn(actor as Actor, team) === "LIDER"
}

export function puedeRegistrarAvance(actorId: string, responsableId: string | null, puedeEditar: boolean) {
  return Boolean(responsableId) && responsableId === actorId && !puedeEditar
}

export function transicionTareaValida(desde: EstadoTareaPlan, hacia: EstadoTareaPlan) {
  if (desde === hacia) return true
  return SIGUIENTE[desde].includes(hacia)
}

export function estadosEditables(actual: EstadoTareaPlan) {
  return [actual, ...SIGUIENTE[actual]]
}

export type FilaPlan = {
  id: string
  proyectoId: string
  proyecto: string
  area: string
  team: string | null
  actividad: string
  responsableId: string | null
  responsable: string
  participantes: string[]
  estado: EstadoTareaPlan
  bloqueo: string
  notaRol: string
  inicio: string | null
  fin: string | null
  inicioProyecto: string | null
  finProyecto: string | null
  horasEstimadas: number | null
  horasReales: number | null
  kpiNombre: string
  kpiMeta: number | null
  kpiUnidad: string
  kpiActual: number | null
  puedeEditar: boolean
  puedeRegistrar: boolean
}

export function etiquetaArea(team: string | null, description = "") {
  const marca = description.split("\n")[0]?.trim() ?? ""
  if (marca.startsWith("Área: ")) return marca.slice("Área: ".length).trim()
  if (team && esTeam(team)) return TEAM_LABEL[team]
  return "Sin área"
}

export function presentarTarea(input: {
  id: string
  title: string
  participantes: string | null
  bloqueo: string | null
  notaRol: string | null
  status: EstadoTareaPlan
  dueDate: Date | null
  fechaInicio: Date | null
  assigneeId: string | null
  assigneeName: string | null
  proyectoId: string
  proyecto: string
  team: string | null
  description?: string
  startsAt?: Date | null
  targetAt?: Date | null
  horasEstimadas?: { toString(): string } | number | null
  horasReales?: { toString(): string } | number | null
  kpiNombre?: string | null
  kpiMeta?: { toString(): string } | number | null
  kpiUnidad?: string | null
  kpiActual?: { toString(): string } | number | null
  puedeEditar: boolean
  puedeRegistrar: boolean
}): FilaPlan {
  const parsed = parsearTituloPlan(input.title)
  const guardados = input.participantes ? partirParticipantes(input.participantes) : []
  const delRol = partirParticipantes(input.notaRol || parsed.notaRol)
  const fecha = (valor: Date | null | undefined) => (valor ? valor.toISOString().slice(0, 10) : null)
  const cantidad = (valor: { toString(): string } | number | null | undefined) => (valor == null ? null : Number(valor))
  return {
    id: input.id,
    proyectoId: input.proyectoId,
    proyecto: input.proyecto,
    area: etiquetaArea(input.team, input.description),
    team: input.team,
    actividad: parsed.titulo,
    responsableId: input.assigneeId,
    responsable: input.assigneeName || "Sin asignar",
    participantes: guardados.length ? guardados : parsed.participantes.length ? parsed.participantes : delRol,
    estado: input.status,
    bloqueo: input.bloqueo?.trim() || parsed.bloqueo,
    notaRol: input.notaRol?.trim() || parsed.notaRol,
    inicio: fecha(input.fechaInicio),
    fin: fecha(input.dueDate),
    inicioProyecto: fecha(input.startsAt),
    finProyecto: fecha(input.targetAt),
    horasEstimadas: cantidad(input.horasEstimadas),
    horasReales: cantidad(input.horasReales),
    kpiNombre: input.kpiNombre?.trim() || "",
    kpiMeta: cantidad(input.kpiMeta),
    kpiUnidad: input.kpiUnidad?.trim() || "",
    kpiActual: cantidad(input.kpiActual),
    puedeEditar: input.puedeEditar,
    puedeRegistrar: input.puedeRegistrar,
  }
}

export function textoKpi(fila: Pick<FilaPlan, "kpiNombre" | "kpiActual" | "kpiMeta" | "kpiUnidad">) {
  if (!fila.kpiNombre && fila.kpiActual == null && fila.kpiMeta == null) return ""
  const actual = fila.kpiActual == null ? "—" : String(fila.kpiActual)
  const meta = fila.kpiMeta == null ? "—" : String(fila.kpiMeta)
  return `${actual} / ${meta}${fila.kpiUnidad ? ` ${fila.kpiUnidad}` : ""}`
}

export function avanceKpi(actual: number | null, meta: number | null) {
  if (actual == null || meta == null || meta <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((actual / meta) * 100)))
}

export function sumarHoras(filas: Pick<FilaPlan, "horasEstimadas" | "horasReales">[]) {
  return {
    estimadas: filas.reduce((total, fila) => total + (fila.horasEstimadas ?? 0), 0),
    reales: filas.reduce((total, fila) => total + (fila.horasReales ?? 0), 0),
  }
}

export type FiltrosPlan = {
  q?: string
  area?: string
  persona?: string
  estado?: string
  proyecto?: string
  sinAsignar?: boolean
  bloqueadas?: boolean
}

export function filtrarPlan(filas: FilaPlan[], filtros: FiltrosPlan) {
  const q = filtros.q?.trim().toLowerCase() ?? ""
  const persona = filtros.persona?.trim().toLowerCase() ?? ""
  return filas.filter((fila) => {
    if (filtros.area && fila.team !== filtros.area && fila.area !== filtros.area) return false
    if (filtros.estado && fila.estado !== filtros.estado) return false
    if (filtros.proyecto && fila.proyectoId !== filtros.proyecto && fila.proyecto !== filtros.proyecto) return false
    if (filtros.sinAsignar && fila.responsableId) return false
    if (filtros.bloqueadas && !fila.bloqueo) return false
    if (persona) {
      const enResponsable = fila.responsable.toLowerCase().includes(persona)
      const enParticipante = fila.participantes.some((item) => item.toLowerCase().includes(persona))
      if (!enResponsable && !enParticipante) return false
    }
    if (q) {
      const texto = [fila.proyecto, fila.area, fila.actividad, fila.responsable, fila.bloqueo, fila.notaRol, ...fila.participantes].join(" ").toLowerCase()
      if (!texto.includes(q)) return false
    }
    return true
  })
}

export function resumenEstados(filas: FilaPlan[]) {
  return ESTADOS_TAREA.map((estado) => ({
    estado,
    label: ESTADO_TAREA_LABEL[estado],
    total: filas.filter((fila) => fila.estado === estado).length,
  }))
}

export function textoFecha(propia: string | null, respaldo: string | null) {
  return propia || respaldo || ""
}

export function areasDelPlan(filas: FilaPlan[]) {
  const teams = new Set(filas.map((fila) => fila.team).filter((team): team is string => Boolean(team)))
  return [...teams].filter(esTeam).map((team) => ({ team, area: TEAM_LABEL[team] }))
}

export type TeamPlan = TeamName
