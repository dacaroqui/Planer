import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado, esTeam, type Actor, type TeamName } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"
import {
  FASES_POR_AREA,
  MARCA_LABEL,
  META_LABEL,
  TEAM_LABEL,
  TIPO_KPI_LABEL,
  areasVisibles,
  diasEntre,
  excedeTope,
  mensajeCupo,
  numero,
  puedeAprobarMeta,
  puedeEditarArea,
  puedeProponerMeta,
  puedeVerMatriz,
  sumarPiezas,
  type Pieza,
} from "@/lib/objetivos"

function exigirVer(actor: Actor) {
  if (!puedeVerMatriz(actor)) throw new PermisoDenegado("Los objetivos son para los equipos y los administradores.")
}

function num(valor: string | null | undefined) {
  if (valor == null || valor.trim() === "") return null
  const n = Number(valor.replace(",", "."))
  if (!Number.isFinite(n)) throw new DomainError("Indique un número válido.")
  return n
}

function dia(valor: string) {
  const fecha = new Date(`${valor}T12:00:00.000Z`)
  if (!valor || Number.isNaN(fecha.getTime())) throw new DomainError("La fecha no es válida.")
  return fecha
}

export async function asegurarFases() {
  for (const team of Object.keys(FASES_POR_AREA) as TeamName[]) {
    for (const [orden, nombre] of FASES_POR_AREA[team].entries()) {
      await prisma.faseArea.upsert({
        where: { team_nombre: { team, nombre } },
        update: { orden },
        create: { team, nombre, orden },
      })
    }
  }
}

export async function listarFases(team?: TeamName | null) {
  await asegurarFases()
  return prisma.faseArea.findMany({
    where: team ? { team } : {},
    orderBy: [{ team: "asc" }, { orden: "asc" }],
  })
}

export async function listarObjetivos(actor: Actor, filtros: { marca?: string; area?: string; dueno?: string; desde?: string; hasta?: string; fase?: string }) {
  exigirVer(actor)
  const areas = areasVisibles(actor)
  const objetivos = await prisma.objetivo.findMany({
    where: {
      ...(esAdmin(actor) ? {} : { OR: [{ area: { in: areas } }, { duenoId: actor.id }] }),
      ...(filtros.marca ? { marca: filtros.marca } : {}),
      ...(filtros.area && esTeam(filtros.area) ? { area: filtros.area } : {}),
      ...(filtros.dueno ? { duenoId: filtros.dueno } : {}),
      ...(filtros.desde ? { periodoFin: { gte: dia(filtros.desde) } } : {}),
      ...(filtros.hasta ? { periodoInicio: { lte: dia(filtros.hasta) } } : {}),
    },
    include: {
      dueno: { select: { id: true, name: true } },
      kpis: { include: { mediciones: { orderBy: { fecha: "asc" } } } },
      proyectos: {
        include: {
          leader: { select: { name: true } },
          tasks: { where: { parentId: null }, include: { assignee: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ marca: "asc" }, { titulo: "asc" }],
  })
  return objetivos.map((objetivo) => {
    const proyectos = objetivo.proyectos
      .filter((proyecto) => !filtros.fase || proyecto.fase === filtros.fase)
      .map((proyecto) => {
        const actividades = proyecto.tasks.map((tarea) => ({
          id: tarea.id,
          titulo: tarea.title,
          responsable: tarea.assignee?.name || "Sin asignar",
          inicio: tarea.fechaInicio?.toISOString().slice(0, 10) ?? null,
          fin: tarea.dueDate?.toISOString().slice(0, 10) ?? null,
          horas: numero(tarea.horasEstimadas),
          costo: numero(tarea.costo),
        }))
        const suma = sumarPiezas(actividades)
        const costo = suma.costo || numero(proyecto.costo)
        return { ...proyecto, actividades, horas: suma.horas, costoRollup: costo }
      })
    const rollup = sumarPiezas(proyectos.map((proyecto) => ({ horas: proyecto.horas, costo: proyecto.costoRollup })))
    return {
      ...objetivo,
      costoTope: objetivo.costoTope == null ? null : numero(objetivo.costoTope),
      horas: rollup.horas,
      costo: rollup.costo,
      excede: excedeTope(rollup.costo, objetivo.costoTope == null ? null : numero(objetivo.costoTope)),
      proyectos,
      kpis: objetivo.kpis.map(presentarKpi),
    }
  }).filter((objetivo) => !filtros.fase || objetivo.proyectos.length > 0)
}

export function presentarKpi<T extends { lineaBase: unknown; meta: unknown; actual: unknown; mediciones: { fecha: Date; valor: unknown }[] }>(kpi: T) {
  return {
    ...kpi,
    lineaBase: kpi.lineaBase == null ? null : numero(kpi.lineaBase as number),
    meta: kpi.meta == null ? null : numero(kpi.meta as number),
    actual: kpi.actual == null ? null : numero(kpi.actual as number),
    tendencia: kpi.mediciones.map((item) => numero(item.valor as number)),
  }
}

export async function guardarObjetivo(actor: Actor, input: {
  id?: string
  marca: string
  titulo: string
  descripcion: string
  area: string
  duenoId: string
  periodoInicio: string
  periodoFin: string
  costoTope: string
  estado: "ABIERTO" | "EN_CURSO" | "CERRADO"
}) {
  exigirVer(actor)
  if (!esTeam(input.area)) throw new DomainError("Elija el área.")
  if (!puedeEditarArea(actor, input.area)) throw new PermisoDenegado("Solo el líder del área o un administrador edita objetivos.")
  if (input.titulo.trim().length < 3) throw new DomainError("Indique el título del objetivo.")
  const data = {
    marca: input.marca,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion.trim(),
    area: input.area,
    duenoId: input.duenoId,
    periodoInicio: dia(input.periodoInicio),
    periodoFin: dia(input.periodoFin),
    costoTope: num(input.costoTope),
    estado: input.estado,
  }
  if (data.periodoFin < data.periodoInicio) throw new DomainError("El periodo no puede terminar antes de empezar.")
  if (input.id) return prisma.objetivo.update({ where: { id: input.id }, data })
  return prisma.objetivo.create({ data })
}

export async function guardarKpi(actor: Actor, input: {
  id?: string
  nombre: string
  descripcion: string
  unidad: string
  lineaBase: string
  meta: string
  actual: string
  fuente: string
  frecuencia: "SEMANAL" | "QUINCENAL" | "MENSUAL"
  tipo: "PRINCIPAL" | "APOYO"
  nivel: "objetivo" | "area" | "persona"
  objetivoId: string
  area: string
  personaId: string
  apoyaId: string
  bloqueado: boolean
  motivoBloqueo: string
}) {
  exigirVer(actor)
  if (input.nombre.trim().length < 2) throw new DomainError("Indique el nombre del KPI.")
  const dueno = input.nivel === "persona" ? (input.personaId || actor.id) : ""
  if (input.nivel === "objetivo" && !input.objetivoId) throw new DomainError("Elija el objetivo.")
  if (input.nivel === "area") {
    if (!esTeam(input.area)) throw new DomainError("Elija el área.")
    if (!puedeEditarArea(actor, input.area)) throw new PermisoDenegado("Solo el líder del área o un administrador edita los KPIs del área.")
  }
  if (input.nivel === "persona" && dueno !== actor.id && !esAdmin(actor)) {
    throw new PermisoDenegado("Solo puede crear sus propios KPIs.")
  }
  if (input.nivel === "persona") {
    const actuales = await prisma.kpi.findMany({ where: { personaId: dueno }, select: { id: true, tipo: true } })
    const cupo = mensajeCupo(actuales, input.tipo, input.id)
    if (cupo) throw new DomainError(cupo)
  }
  if (input.nivel === "objetivo") {
    const objetivo = await prisma.objetivo.findUnique({ where: { id: input.objetivoId } })
    if (!objetivo) throw new DomainError("El objetivo no existe.")
    if (!puedeEditarArea(actor, objetivo.area)) throw new PermisoDenegado("Solo el líder del área o un administrador edita los KPIs del objetivo.")
  }
  const data = {
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim(),
    unidad: input.unidad.trim(),
    lineaBase: num(input.lineaBase),
    meta: num(input.meta),
    actual: num(input.actual),
    fuente: input.fuente.trim(),
    frecuencia: input.frecuencia,
    tipo: input.nivel === "persona" ? input.tipo : "APOYO" as const,
    bloqueado: input.bloqueado,
    motivoBloqueo: input.bloqueado ? input.motivoBloqueo.trim() : "",
    objetivoId: input.nivel === "objetivo" ? input.objetivoId : null,
    area: input.nivel === "area" && esTeam(input.area) ? input.area : null,
    personaId: input.nivel === "persona" ? dueno : null,
    apoyaId: input.apoyaId || null,
  }
  if (input.id) return prisma.kpi.update({ where: { id: input.id }, data })
  return prisma.kpi.create({ data })
}

export async function registrarMedicion(actor: Actor, input: { kpiId: string; valor: string; nota: string; fecha: string }) {
  const kpi = await prisma.kpi.findUnique({ where: { id: input.kpiId } })
  if (!kpi) throw new DomainError("El KPI no existe.")
  const propio = kpi.personaId === actor.id
  const lider = kpi.area ? puedeEditarArea(actor, kpi.area) : kpi.objetivoId
    ? puedeEditarArea(actor, (await prisma.objetivo.findUnique({ where: { id: kpi.objetivoId } }))?.area || "MARKETING")
    : false
  if (!propio && !lider && !esAdmin(actor)) throw new PermisoDenegado("Solo el dueño del KPI registra mediciones.")
  const valor = num(input.valor)
  if (valor == null) throw new DomainError("Indique el valor medido.")
  const medicion = await prisma.kpiMedicion.create({
    data: { kpiId: kpi.id, valor, nota: input.nota.trim(), fecha: dia(input.fecha || new Date().toISOString().slice(0, 10)), registradoPorId: actor.id },
  })
  await prisma.kpi.update({
    where: { id: kpi.id },
    data: { actual: valor, ...(kpi.lineaBase == null ? { lineaBase: valor } : {}) },
  })
  return medicion
}

export async function proponerMeta(actor: Actor, input: { kpiId: string; meta: string }) {
  const kpi = await prisma.kpi.findUnique({ where: { id: input.kpiId }, include: { _count: { select: { mediciones: true } } } })
  if (!kpi?.personaId) throw new DomainError("La meta de las semanas 1 a 3 aplica a los KPIs de una persona.")
  if (kpi.personaId !== actor.id && !esAdmin(actor)) throw new PermisoDenegado("Solo la persona propone su meta.")
  if (!puedeProponerMeta(kpi._count.mediciones)) throw new DomainError("Mida la línea base durante tres semanas antes de proponer la meta.")
  const meta = num(input.meta)
  if (meta == null) throw new DomainError("Indique la meta propuesta.")
  return prisma.kpi.update({ where: { id: kpi.id }, data: { meta, estadoMeta: "PROPUESTA" } })
}

export async function aprobarMeta(actor: Actor, kpiId: string) {
  if (!puedeAprobarMeta(actor)) throw new PermisoDenegado("Solo un administrador aprueba la meta.")
  const kpi = await prisma.kpi.findUnique({ where: { id: kpiId } })
  if (!kpi || kpi.estadoMeta !== "PROPUESTA") throw new DomainError("La meta todavía no está propuesta.")
  return prisma.kpi.update({ where: { id: kpiId }, data: { estadoMeta: "APROBADA" } })
}

export async function asignarProyecto(actor: Actor, input: { proyectoId: string; objetivoId: string; fase: string; medio: string; costo: string }) {
  const proyecto = await prisma.proyecto.findUnique({ where: { id: input.proyectoId } })
  if (!proyecto) throw new DomainError("El proyecto no existe.")
  const area = proyecto.team
  if (!area || !puedeEditarArea(actor, area)) throw new PermisoDenegado("Solo el líder del área o un administrador asigna el proyecto.")
  return prisma.proyecto.update({
    where: { id: proyecto.id },
    data: {
      objetivoId: input.objetivoId || null,
      fase: input.fase,
      medio: input.medio.trim(),
      costo: num(input.costo),
    },
  })
}

export async function vincularExperimento(actor: Actor, input: { id: string; objetivoId: string; kpiId: string }) {
  if (!puedeVerMatriz(actor)) throw new PermisoDenegado("No puede vincular el experimento.")
  return prisma.growthExperimento.update({
    where: { id: input.id },
    data: { objetivoId: input.objetivoId || null, kpiId: input.kpiId || null },
  })
}

export async function kpisDeArea(actor: Actor) {
  exigirVer(actor)
  await asegurarFases()
  const areas = areasVisibles(actor)
  const [propios, deObjetivo] = await Promise.all([
    prisma.kpi.findMany({ where: { area: { in: areas } }, include: { mediciones: { orderBy: { fecha: "asc" } } } }),
    prisma.kpi.findMany({ where: { objetivo: { area: { in: areas } } }, include: { objetivo: true, mediciones: { orderBy: { fecha: "asc" } } } }),
  ])
  return areas.map((area) => {
    const kpis = [...propios.filter((item) => item.area === area), ...deObjetivo.filter((item) => item.objetivo?.area === area)].map(presentarKpi)
    const conMeta = kpis.filter((item) => item.meta)
    const avance = conMeta.length
      ? Math.round(conMeta.reduce((total, item) => total + Math.min(100, ((item.actual ?? 0) / (item.meta || 1)) * 100), 0) / conMeta.length)
      : 0
    return { area, kpis, avance }
  })
}

export async function kpisDePersona(actor: Actor, personaId?: string) {
  exigirVer(actor)
  const id = personaId && (esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER")) ? personaId : actor.id
  if (id !== actor.id && !esAdmin(actor) && !actor.memberships.some((item) => item.role === "LIDER")) {
    throw new PermisoDenegado("Solo un administrador ve los KPIs de otra persona.")
  }
  const personas = esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER")
    ? await prisma.user.findMany({ where: { active: true, deactivatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [{ id: actor.id, name: actor.name }]
  const kpis = await prisma.kpi.findMany({
    where: { personaId: id },
    include: { mediciones: { orderBy: { fecha: "asc" } }, apoya: { select: { id: true, nombre: true } } },
    orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
  })
  return { personaId: id, personas, kpis: kpis.map(presentarKpi) }
}

export async function matrizExportable(actor: Actor) {
  const objetivos = await listarObjetivos(actor, {})
  const filas: string[][] = [[
    "Marca", "Objetivo", "Área", "Dueño", "KPI", "Línea base", "Meta", "Actual", "Entregable/Proyecto", "Medio", "Fase", "Actividad", "Responsable", "Inicio", "Fin", "Días", "Horas", "Costo",
  ]]
  for (const objetivo of objetivos) {
    const kpis = objetivo.kpis.map((kpi) => `${kpi.nombre}${kpi.bloqueado ? " (bloqueado)" : ""}`).join("; ")
    const base = objetivo.kpis.map((kpi) => kpi.lineaBase ?? "").join("; ")
    const meta = objetivo.kpis.map((kpi) => kpi.meta ?? "").join("; ")
    const actual = objetivo.kpis.map((kpi) => kpi.actual ?? "").join("; ")
    if (objetivo.proyectos.length === 0) {
      filas.push([MARCA_LABEL[objetivo.marca as "CIFES"] || objetivo.marca, objetivo.titulo, TEAM_LABEL[objetivo.area], objetivo.dueno.name, kpis, base, meta, actual, "", "", "", "", "", "", "", "", String(objetivo.horas), String(objetivo.costo)])
    }
    for (const proyecto of objetivo.proyectos) {
      if (proyecto.actividades.length === 0) {
        filas.push([MARCA_LABEL[objetivo.marca as "CIFES"] || objetivo.marca, objetivo.titulo, TEAM_LABEL[objetivo.area], objetivo.dueno.name, kpis, base, meta, actual, proyecto.name, proyecto.medio, proyecto.fase, "", proyecto.leader.name, "", "", "", String(proyecto.horas), String(proyecto.costoRollup)])
      }
      for (const actividad of proyecto.actividades) {
        filas.push([
          MARCA_LABEL[objetivo.marca as "CIFES"] || objetivo.marca, objetivo.titulo, TEAM_LABEL[objetivo.area], objetivo.dueno.name, kpis, base, meta, actual,
          proyecto.name, proyecto.medio, proyecto.fase, actividad.titulo, actividad.responsable,
          actividad.inicio ?? "", actividad.fin ?? "", diasEntre(actividad.inicio, actividad.fin),
          String(actividad.horas), String(actividad.costo),
        ])
      }
    }
  }
  const personas = await prisma.kpi.findMany({
    where: { personaId: { not: null } },
    include: { persona: { select: { name: true } } },
    orderBy: [{ persona: { name: "asc" } }, { tipo: "asc" }],
  })
  const hojaPersona = [["Persona", "Tipo", "KPI", "Unidad", "Línea base", "Meta", "Actual", "Estado de meta", "Bloqueado", "Motivo"],
    ...personas.map((kpi) => [kpi.persona?.name ?? "", TIPO_KPI_LABEL[kpi.tipo], kpi.nombre, kpi.unidad, String(numero(kpi.lineaBase) || ""), String(numero(kpi.meta) || ""), String(numero(kpi.actual) || ""), META_LABEL[kpi.estadoMeta], kpi.bloqueado ? "Sí" : "", kpi.motivoBloqueo])]
  const areas = await kpisDeArea(actor)
  const hojaArea = [["Área", "Origen", "KPI", "Unidad", "Meta", "Actual", "Bloqueado"],
    ...areas.flatMap((panel) => panel.kpis.map((kpi) => [TEAM_LABEL[panel.area], kpi.objetivoId ? "Objetivo" : "Área", kpi.nombre, kpi.unidad, String(kpi.meta ?? ""), String(kpi.actual ?? ""), kpi.bloqueado ? kpi.motivoBloqueo || "Sí" : ""]))]
  return { matriz: filas, personas: hojaPersona, areas: hojaArea }
}

export type { Pieza }
