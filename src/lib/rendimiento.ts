import { DateTime } from "luxon"
import type { Actor, SlaState, TeamName } from "@/lib/domain"
import { snapshotSolucion } from "@/lib/sla-solicitud"
import { ZONE } from "@/lib/time"

export const UMBRAL_RIESGO_ABIERTO = 0.8

export const ORDENES = [
  "nombre",
  "asignados",
  "completados",
  "pendientes",
  "cumplimiento",
  "dentroSla",
  "fueraSla",
  "pctDentroSla",
  "horasPromedio",
  "horasMediana",
  "horasDemora",
  "slaAbiertoPromedio",
  "enRiesgo",
  "vencidos",
  "tareasSemana",
  "tareasMes",
  "tareasAnio",
  "tareasAsignadas",
  "tareasCompletadas",
  "tareasSinHacer",
] as const

export type OrdenRendimiento = (typeof ORDENES)[number]
export type PeriodoClave = "semana" | "mes" | "anio" | "rango"
export type Direccion = "asc" | "desc"

export type Rango = { start: Date; end: Date; clave: PeriodoClave; etiqueta: string }

export type FiltrosRendimiento = {
  periodo: PeriodoClave
  desde?: string
  hasta?: string
  personas: string[]
  areaId?: string
  empresaId?: string
  equipo?: TeamName
  tipoId?: string
  prioridad?: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  orden: OrdenRendimiento
  dir: Direccion
}

export type SolicitudMedible = {
  id: string
  code: string
  title: string
  assigneeId: string
  status: string
  priority: string
  slaStartedAt: Date
  slaTargetMinutes: number
  resolutionMinutes: number
  resolvedAt: Date | null
  createdAt: Date
  pauses: { startedAt: Date; endedAt: Date | null }[]
}

export type TareasAgg = {
  semana: number
  mes: number
  anio: number
  asignadas: number
  completadas: number
  sinHacer: number
}

export type PersonaRendimiento = {
  id: string
  nombre: string
  email: string
  areaId: string
  area: string
  equipos: string
}

export type FilaRendimiento = {
  id: string
  nombre: string
  email: string
  area: string
  equipos: string
  asignados: number
  completados: number
  pendientes: number
  cumplimiento: number | null
  dentroSla: number
  fueraSla: number
  pctDentroSla: number | null
  horasPromedio: number | null
  horasMediana: number | null
  horasDemora: number | null
  slaAbiertoPromedio: number | null
  enRiesgo: number
  vencidos: number
  tareasSemana: number
  tareasMes: number
  tareasAnio: number
  tareasAsignadas: number
  tareasCompletadas: number
  tareasSinHacer: number
}

export type ResumenRendimiento = {
  personas: number
  asignados: number
  completados: number
  pendientes: number
  cumplimiento: number | null
  dentroSla: number
  fueraSla: number
  pctDentroSla: number | null
  horasPromedio: number | null
  horasMediana: number | null
  horasDemora: number | null
  slaAbiertoPromedio: number | null
  enRiesgo: number
  vencidos: number
  tareasCompletadas: number
}

export type SolicitudVista = {
  id: string
  code: string
  title: string
  status: string
  priority: string
  state: SlaState
  ratio: number
  horas: number
  demora: number | null
  completado: boolean
}

export type PuntoTendencia = {
  clave: string
  etiqueta: string
  completados: number
  pctSla: number | null
}

export type OpcionesRendimiento = {
  personas: { id: string; nombre: string }[]
  areas: { id: string; nombre: string }[]
  empresas: { id: string; nombre: string }[]
  tipos: { id: string; nombre: string; equipo: TeamName }[]
}

export type AlcanceRendimiento =
  | { tipo: "todos" }
  | { tipo: "equipos"; teams: TeamName[] }
  | { tipo: "propio" }
  | { tipo: "ninguno" }

export type PersonaCandidata = {
  id: string
  teams: TeamName[]
  roles: Array<"AGENTE" | "LIDER" | "OBSERVADOR" | "ADMINISTRADOR">
}

const PESO_SLA: Record<SlaState, number> = {
  VENCIDO: 0,
  INCUMPLIDO: 1,
  EN_RIESGO: 2,
  EN_PAUSA: 3,
  A_TIEMPO: 4,
  CUMPLIDO: 5,
  NO_APLICA: 6,
}

export function alcanceRendimiento(actor: Actor): AlcanceRendimiento {
  if (!actor.active) return { tipo: "ninguno" }
  if (actor.isAdmin) return { tipo: "todos" }
  const teams = [...new Set(actor.memberships.filter((item) => item.role === "LIDER").map((item) => item.team))]
  if (teams.length > 0) return { tipo: "equipos", teams }
  if (actor.memberships.some((item) => item.role === "AGENTE") || actor.role === "AGENTE") return { tipo: "propio" }
  return { tipo: "ninguno" }
}

export function personasPermitidas<T extends PersonaCandidata>(actor: Actor, candidatas: T[]) {
  const alcance = alcanceRendimiento(actor)
  if (alcance.tipo === "ninguno") return []
  if (alcance.tipo === "propio") return candidatas.filter((item) => item.id === actor.id)
  if (alcance.tipo === "todos") {
    return candidatas.filter((item) => item.roles.includes("AGENTE") || item.roles.includes("LIDER") || item.roles.includes("ADMINISTRADOR"))
  }
  return candidatas.filter((item) =>
    (item.roles.includes("AGENTE") || item.roles.includes("LIDER"))
    && item.teams.some((team) => alcance.teams.includes(team)),
  )
}

export function aplicarSeleccion<T extends { id: string }>(alcance: AlcanceRendimiento, personas: T[], seleccion: string[]) {
  if (alcance.tipo === "propio" || alcance.tipo === "ninguno" || seleccion.length === 0) return personas
  const pedidas = new Set(seleccion)
  return personas.filter((item) => pedidas.has(item.id))
}

export function rangoPeriodo(input: {
  periodo: PeriodoClave
  desde?: string | null
  hasta?: string | null
  now?: Date
}): Rango {
  const ahora = DateTime.fromJSDate(input.now ?? new Date(), { zone: ZONE })
  if (input.periodo === "semana") return cerrar(ahora.startOf("week"), { weeks: 1 }, "semana", "Semana")
  if (input.periodo === "anio") return cerrar(ahora.startOf("year"), { years: 1 }, "anio", "Año")
  if (input.periodo === "rango") {
    const desde = parseDia(input.desde)
    const hasta = parseDia(input.hasta)
    if (desde && hasta) {
      const inicio = desde <= hasta ? desde : hasta
      const fin = desde <= hasta ? hasta : desde
      const start = DateTime.fromISO(inicio, { zone: ZONE }).startOf("day")
      const end = DateTime.fromISO(fin, { zone: ZONE }).startOf("day").plus({ days: 1 })
      return { start: start.toJSDate(), end: end.toJSDate(), clave: "rango", etiqueta: "Rango" }
    }
  }
  return cerrar(ahora.startOf("month"), { months: 1 }, "mes", "Mes")
}

function cerrar(start: DateTime, plus: { weeks?: number; months?: number; years?: number }, clave: PeriodoClave, etiqueta: string): Rango {
  return { start: start.toJSDate(), end: start.plus(plus).toJSDate(), clave, etiqueta }
}

export function parseDia(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const dia = DateTime.fromISO(value, { zone: ZONE })
  if (!dia.isValid || dia.toISODate() !== value) return null
  return value
}

export function instanteDeCorte(periodo: Rango, now: Date) {
  if (now.getTime() < periodo.start.getTime()) return periodo.start
  if (now.getTime() >= periodo.end.getTime()) return new Date(periodo.end.getTime() - 1)
  return now
}

export function textoPeriodo(periodo: Rango) {
  const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: ZONE })
  const ultimo = new Date(periodo.end.getTime() - 1)
  return `${periodo.etiqueta}: ${fmt.format(periodo.start)} – ${fmt.format(ultimo)}`
}

type Parametros = Record<string, string | string[] | undefined>

export function leerFiltros(params: Parametros, now = new Date()): FiltrosRendimiento {
  const uno = (key: string) => {
    const value = params[key]
    const raw = (Array.isArray(value) ? value[0] : value)?.trim()
    return raw || undefined
  }
  const varios = (key: string) => {
    const value = params[key]
    const lista = Array.isArray(value) ? value : value ? [value] : []
    return [...new Set(lista.flatMap((item) => item.split(",")).map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 80))].slice(0, 100)
  }
  const pedido = uno("periodo")
  const periodo: PeriodoClave = pedido === "semana" || pedido === "mes" || pedido === "anio" || pedido === "rango" ? pedido : "mes"
  const desde = parseDia(uno("desde")) ?? undefined
  const hasta = parseDia(uno("hasta")) ?? undefined
  const rango = rangoPeriodo({ periodo, desde, hasta, now })
  const ordenPedido = uno("orden")
  const orden: OrdenRendimiento = ORDENES.includes(ordenPedido as OrdenRendimiento) ? ordenPedido as OrdenRendimiento : "nombre"
  const dirPedido = uno("dir")
  const dir: Direccion = dirPedido === "asc" || dirPedido === "desc" ? dirPedido : orden === "nombre" ? "asc" : "desc"
  const equipo = uno("equipo")
  const prioridad = uno("prioridad")
  return {
    periodo: rango.clave,
    desde,
    hasta,
    personas: varios("persona"),
    areaId: acotar(uno("area")),
    empresaId: acotar(uno("empresa")),
    equipo: equipo === "DESARROLLO" || equipo === "MARKETING" ? equipo : undefined,
    tipoId: acotar(uno("tipo")),
    prioridad: prioridad === "BAJA" || prioridad === "MEDIA" || prioridad === "ALTA" || prioridad === "CRITICA" ? prioridad : undefined,
    orden,
    dir,
  }
}

function acotar(value?: string) {
  if (!value || value.length > 80) return undefined
  return value
}

const PERIODO_CORTO: Record<PeriodoClave, string> = {
  semana: "Semana",
  mes: "Mes",
  anio: "Año",
  rango: "Rango",
}

export type ChipRendimiento = { id: string; texto: string; patch: Partial<FiltrosRendimiento> }

export function filtrosLimpios(): Partial<FiltrosRendimiento> {
  return {
    periodo: "mes",
    desde: undefined,
    hasta: undefined,
    personas: [],
    areaId: undefined,
    empresaId: undefined,
    equipo: undefined,
    tipoId: undefined,
    prioridad: undefined,
  }
}

export function chipsRendimiento(
  filtros: FiltrosRendimiento,
  nombres: { persona: Map<string, string>; area: Map<string, string>; empresa: Map<string, string>; tipo: Map<string, string> },
): ChipRendimiento[] {
  const chips: ChipRendimiento[] = []
  if (filtros.periodo !== "mes") {
    const detalle = filtros.periodo === "rango" && filtros.desde && filtros.hasta
      ? `${filtros.desde} – ${filtros.hasta}`
      : PERIODO_CORTO[filtros.periodo]
    chips.push({
      id: "periodo",
      texto: `Periodo: ${detalle}`,
      patch: { periodo: "mes", desde: undefined, hasta: undefined },
    })
  }
  for (const id of filtros.personas) {
    chips.push({
      id: `persona-${id}`,
      texto: `Persona: ${nombres.persona.get(id) ?? id}`,
      patch: { personas: filtros.personas.filter((item) => item !== id) },
    })
  }
  if (filtros.areaId) chips.push({ id: "area", texto: `Área: ${nombres.area.get(filtros.areaId) ?? filtros.areaId}`, patch: { areaId: undefined } })
  if (filtros.empresaId) chips.push({ id: "empresa", texto: `Espacio: ${nombres.empresa.get(filtros.empresaId) ?? filtros.empresaId}`, patch: { empresaId: undefined } })
  if (filtros.equipo) chips.push({ id: "equipo", texto: `Equipo: ${filtros.equipo === "DESARROLLO" ? "Desarrollo" : "Marketing"}`, patch: { equipo: undefined } })
  if (filtros.tipoId) chips.push({ id: "tipo", texto: `Tipo: ${nombres.tipo.get(filtros.tipoId) ?? filtros.tipoId}`, patch: { tipoId: undefined } })
  if (filtros.prioridad) {
    const prioridad = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica" }[filtros.prioridad]
    chips.push({ id: "prioridad", texto: `Prioridad: ${prioridad}`, patch: { prioridad: undefined } })
  }
  return chips
}

export function hrefRendimiento(base: string, filtros: FiltrosRendimiento, patch: Partial<FiltrosRendimiento> = {}) {
  const next = { ...filtros, ...patch }
  const params = new URLSearchParams()
  params.set("periodo", next.periodo)
  if (next.desde) params.set("desde", next.desde)
  if (next.hasta) params.set("hasta", next.hasta)
  for (const id of next.personas) params.append("persona", id)
  if (next.areaId) params.set("area", next.areaId)
  if (next.empresaId) params.set("empresa", next.empresaId)
  if (next.equipo) params.set("equipo", next.equipo)
  if (next.tipoId) params.set("tipo", next.tipoId)
  if (next.prioridad) params.set("prioridad", next.prioridad)
  if (next.orden !== "nombre" || next.dir !== "asc") {
    params.set("orden", next.orden)
    params.set("dir", next.dir)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function enCohorte(solicitud: { status: string; createdAt: Date; resolvedAt: Date | null }, periodo: Rango) {
  if (solicitud.status === "CANCELADO" || solicitud.status === "RECHAZADO") return false
  if (solicitud.createdAt.getTime() >= periodo.end.getTime()) return false
  if (solicitud.resolvedAt && solicitud.resolvedAt.getTime() < periodo.start.getTime()) return false
  return true
}

function alCorte(solicitud: SolicitudMedible, periodo: Rango): SolicitudMedible {
  if (solicitud.resolvedAt && solicitud.resolvedAt.getTime() >= periodo.end.getTime()) {
    return { ...solicitud, resolvedAt: null }
  }
  return solicitud
}

function estaCompletado(solicitud: SolicitudMedible, periodo: Rango) {
  return (solicitud.status === "CERRADO" || solicitud.status === "HECHO")
    && solicitud.resolvedAt !== null
    && solicitud.resolvedAt.getTime() >= periodo.start.getTime()
    && solicitud.resolvedAt.getTime() < periodo.end.getTime()
}

type Medicion = {
  completado: boolean
  target: number
  state: SlaState
  ratio: number
  horas: number
  demora: number | null
  dentro: boolean
  fuera: boolean
}

function medir(solicitud: SolicitudMedible, periodo: Rango, instante: Date): Medicion {
  const { target, snap } = snapshotSolucion(alCorte(solicitud, periodo), instante)
  const completado = estaCompletado(solicitud, periodo)
  const fuera = snap.state === "INCUMPLIDO" || snap.state === "VENCIDO"
  const dentro = snap.state !== "NO_APLICA" && !fuera
  const demora = fuera ? Math.max(0, snap.consumedMinutes - target) / 60 : null
  return { completado, target, state: snap.state, ratio: snap.ratio, horas: snap.consumedMinutes / 60, demora, dentro, fuera }
}

function promedio(valores: number[]) {
  if (valores.length === 0) return null
  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length
}

export function mediana(valores: number[]) {
  if (valores.length === 0) return null
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  if (ordenados.length % 2 === 1) return ordenados[medio]
  return (ordenados[medio - 1] + ordenados[medio]) / 2
}

function pct(parte: number, total: number) {
  if (total <= 0) return null
  return (parte / total) * 100
}

const TAREAS_VACIAS: TareasAgg = { semana: 0, mes: 0, anio: 0, asignadas: 0, completadas: 0, sinHacer: 0 }

function filaDe(persona: PersonaRendimiento, mediciones: Medicion[], tareas: TareasAgg): FilaRendimiento {
  const completados = mediciones.filter((item) => item.completado)
  const horas = completados.map((item) => item.horas)
  const demoras = mediciones.flatMap((item) => item.demora === null ? [] : [item.demora])
  const abiertos = mediciones.filter((item) => !item.completado)
  const dentro = mediciones.filter((item) => item.dentro).length
  const fuera = mediciones.filter((item) => item.fuera).length
  return {
    id: persona.id,
    nombre: persona.nombre,
    email: persona.email,
    area: persona.area,
    equipos: persona.equipos,
    asignados: mediciones.length,
    completados: completados.length,
    pendientes: mediciones.length - completados.length,
    cumplimiento: pct(completados.length, mediciones.length),
    dentroSla: dentro,
    fueraSla: fuera,
    pctDentroSla: pct(dentro, dentro + fuera),
    horasPromedio: promedio(horas),
    horasMediana: mediana(horas),
    horasDemora: promedio(demoras),
    slaAbiertoPromedio: promedio(abiertos.map((item) => item.ratio * 100)),
    enRiesgo: abiertos.filter((item) => item.state !== "VENCIDO" && item.state !== "NO_APLICA" && item.ratio > UMBRAL_RIESGO_ABIERTO).length,
    vencidos: mediciones.filter((item) => item.state === "VENCIDO").length,
    tareasSemana: tareas.semana,
    tareasMes: tareas.mes,
    tareasAnio: tareas.anio,
    tareasAsignadas: tareas.asignadas,
    tareasCompletadas: tareas.completadas,
    tareasSinHacer: tareas.sinHacer,
  }
}

export function armarTablero(input: {
  personas: PersonaRendimiento[]
  solicitudes: SolicitudMedible[]
  tareas: Map<string, TareasAgg>
  periodo: Rango
  now: Date
  orden?: OrdenRendimiento
  dir?: Direccion
}) {
  const instante = instanteDeCorte(input.periodo, input.now)
  const ids = new Set(input.personas.map((item) => item.id))
  const grupos = new Map<string, Medicion[]>()
  const todas: Medicion[] = []
  for (const solicitud of input.solicitudes) {
    if (!ids.has(solicitud.assigneeId) || !enCohorte(solicitud, input.periodo)) continue
    const medicion = medir(solicitud, input.periodo, instante)
    const lista = grupos.get(solicitud.assigneeId) ?? []
    lista.push(medicion)
    grupos.set(solicitud.assigneeId, lista)
    todas.push(medicion)
  }
  const filas = input.personas.map((persona) => filaDe(persona, grupos.get(persona.id) ?? [], input.tareas.get(persona.id) ?? TAREAS_VACIAS))
  const horas = todas.filter((item) => item.completado).map((item) => item.horas)
  const demoras = todas.flatMap((item) => item.demora === null ? [] : [item.demora])
  const abiertos = todas.filter((item) => !item.completado)
  const dentro = todas.filter((item) => item.dentro).length
  const fuera = todas.filter((item) => item.fuera).length
  const completados = todas.filter((item) => item.completado).length
  const resumen: ResumenRendimiento = {
    personas: filas.length,
    asignados: todas.length,
    completados,
    pendientes: todas.length - completados,
    cumplimiento: pct(completados, todas.length),
    dentroSla: dentro,
    fueraSla: fuera,
    pctDentroSla: pct(dentro, dentro + fuera),
    horasPromedio: promedio(horas),
    horasMediana: mediana(horas),
    horasDemora: promedio(demoras),
    slaAbiertoPromedio: promedio(abiertos.map((item) => item.ratio * 100)),
    enRiesgo: filas.reduce((suma, fila) => suma + fila.enRiesgo, 0),
    vencidos: filas.reduce((suma, fila) => suma + fila.vencidos, 0),
    tareasCompletadas: filas.reduce((suma, fila) => suma + fila.tareasCompletadas, 0),
  }
  return { filas: ordenarFilas(filas, input.orden ?? "nombre", input.dir ?? "asc"), resumen }
}

export function ordenarFilas(filas: FilaRendimiento[], orden: OrdenRendimiento, dir: Direccion) {
  const copia = [...filas]
  copia.sort((a, b) => {
    const va = a[orden]
    const vb = b[orden]
    if (typeof va === "string" && typeof vb === "string") {
      const cmp = va.localeCompare(vb, "es")
      return dir === "asc" ? cmp : -cmp
    }
    if (va == null && vb == null) return a.nombre.localeCompare(b.nombre, "es")
    if (va == null) return 1
    if (vb == null) return -1
    if (va === vb) return a.nombre.localeCompare(b.nombre, "es")
    return dir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va)
  })
  return copia
}

export function vistasCohorte(solicitudes: SolicitudMedible[], periodo: Rango, now: Date): SolicitudVista[] {
  const instante = instanteDeCorte(periodo, now)
  return solicitudes
    .filter((solicitud) => enCohorte(solicitud, periodo))
    .map((solicitud) => {
      const medicion = medir(solicitud, periodo, instante)
      return {
        id: solicitud.id,
        code: solicitud.code,
        title: solicitud.title,
        status: solicitud.status,
        priority: solicitud.priority,
        state: medicion.state,
        ratio: medicion.ratio,
        horas: medicion.horas,
        demora: medicion.demora,
        completado: medicion.completado,
      }
    })
    .sort((a, b) => PESO_SLA[a.state] - PESO_SLA[b.state] || a.code.localeCompare(b.code, "es"))
}

export function serieTendencia(solicitudes: SolicitudMedible[], ancla: Date, modo: "semana" | "mes", cantidad: number): PuntoTendencia[] {
  const zona = DateTime.fromJSDate(ancla, { zone: ZONE })
  const actual = modo === "semana" ? zona.startOf("week") : zona.startOf("month")
  const puntos: PuntoTendencia[] = []
  for (let i = cantidad - 1; i >= 0; i -= 1) {
    const start = modo === "semana" ? actual.minus({ weeks: i }) : actual.minus({ months: i })
    const end = modo === "semana" ? start.plus({ weeks: 1 }) : start.plus({ months: 1 })
    const rango: Rango = { start: start.toJSDate(), end: end.toJSDate(), clave: modo === "semana" ? "semana" : "mes", etiqueta: "" }
    const cerrados = solicitudes.filter((solicitud) => estaCompletado(solicitud, rango))
    let cumplidos = 0
    let evaluados = 0
    for (const solicitud of cerrados) {
      const { snap } = snapshotSolucion(solicitud, solicitud.resolvedAt ?? ancla)
      if (snap.state === "NO_APLICA") continue
      evaluados += 1
      if (snap.state === "CUMPLIDO") cumplidos += 1
    }
    puntos.push({
      clave: start.toISODate() ?? String(i),
      etiqueta: start.setLocale("es").toFormat(modo === "semana" ? "d LLL" : "LLL yyyy"),
      completados: cerrados.length,
      pctSla: pct(cumplidos, evaluados),
    })
  }
  return puntos
}

export function ventanasDeTareas(now: Date) {
  const zona = DateTime.fromJSDate(now, { zone: ZONE })
  return {
    semana: cerrar(zona.startOf("week"), { weeks: 1 }, "semana", "Semana"),
    mes: cerrar(zona.startOf("month"), { months: 1 }, "mes", "Mes"),
    anio: cerrar(zona.startOf("year"), { years: 1 }, "anio", "Año"),
  }
}

const CSV_COLUMNAS: Array<[string, (fila: FilaRendimiento) => string | number | null]> = [
  ["Persona", (fila) => fila.nombre],
  ["Correo", (fila) => fila.email],
  ["Área", (fila) => fila.area],
  ["Equipos", (fila) => fila.equipos],
  ["Asignados", (fila) => fila.asignados],
  ["Completados", (fila) => fila.completados],
  ["Pendientes", (fila) => fila.pendientes],
  ["Cumplimiento %", (fila) => fila.cumplimiento],
  ["Dentro de SLA", (fila) => fila.dentroSla],
  ["Fuera de SLA", (fila) => fila.fueraSla],
  ["Dentro de SLA %", (fila) => fila.pctDentroSla],
  ["Horas promedio", (fila) => fila.horasPromedio],
  ["Horas mediana", (fila) => fila.horasMediana],
  ["Demora promedio h", (fila) => fila.horasDemora],
  ["SLA abierto %", (fila) => fila.slaAbiertoPromedio],
  ["En riesgo", (fila) => fila.enRiesgo],
  ["Vencidos", (fila) => fila.vencidos],
  ["Tareas semana", (fila) => fila.tareasSemana],
  ["Tareas mes", (fila) => fila.tareasMes],
  ["Tareas año", (fila) => fila.tareasAnio],
  ["Tareas asignadas", (fila) => fila.tareasAsignadas],
  ["Tareas hechas", (fila) => fila.tareasCompletadas],
  ["Tareas sin hacer", (fila) => fila.tareasSinHacer],
]

function celdaCsv(valor: string | number | null) {
  const texto = valor === null ? "" : typeof valor === "number" ? String(Math.round(valor * 100) / 100) : valor
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replaceAll('"', '""')}"`
}

export function filasACsv(filas: FilaRendimiento[]) {
  const lineas = [
    CSV_COLUMNAS.map(([titulo]) => celdaCsv(titulo)).join(","),
    ...filas.map((fila) => CSV_COLUMNAS.map(([, leer]) => celdaCsv(leer(fila))).join(",")),
  ]
  return `\uFEFF${lineas.join("\r\n")}\r\n`
}

export function textoHoras(valor: number | null) {
  if (valor === null) return "—"
  return `${valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })} h`
}

export function textoPct(valor: number | null) {
  if (valor === null) return "—"
  return `${Math.round(valor).toLocaleString("es-CO")} %`
}

export function textoEntero(valor: number) {
  return valor.toLocaleString("es-CO")
}
