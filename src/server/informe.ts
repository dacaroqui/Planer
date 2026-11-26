import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { CUMPLIMIENTO_LABEL, TEXTO_CUMPLIMIENTO, cumplimientoFecha, porcentajeEntregable } from "@/lib/entregables"
import { META_LABEL } from "@/lib/objetivos"
import type { InformePdf } from "@/lib/informe-pdf"
import { etiquetaArea, textoMedidaKpi, totalesPlan } from "@/lib/plan-trabajo"
import { listarProyectos } from "@/server/proyectos"
import type { Actor } from "@/lib/domain"

export function semanaActual(ahora = DateTime.now().setZone("America/Bogota")) {
  const lunes = ahora.set({ weekday: 1 }).startOf("day")
  return { clave: lunes.toFormat("kkkk-'W'WW"), desde: lunes, hasta: lunes.plus({ days: 6 }).endOf("day") }
}

export function semanaDe(clave: string | undefined) {
  if (!clave || !/^\d{4}-W\d{2}$/.test(clave)) return semanaActual()
  const [anio, numero] = clave.split("-W")
  const lunes = DateTime.fromObject({ weekYear: Number(anio), weekNumber: Number(numero), weekday: 1 }, { zone: "America/Bogota" }).startOf("day")
  if (!lunes.isValid) return semanaActual()
  return { clave, desde: lunes, hasta: lunes.plus({ days: 6 }).endOf("day") }
}

type KpiCorte = { id: string; nombre: string; unidad: string; actual: unknown; meta: unknown; estadoMeta: "EN_LINEA_BASE" | "PROPUESTA" | "APROBADA" }

export function kpisPorAmbito(grupos: { ambito: string; kpis: KpiCorte[] }[]) {
  const vistos = new Set<string>()
  return grupos.flatMap((grupo) => grupo.kpis.filter((kpi) => {
    if (vistos.has(kpi.id)) return false
    vistos.add(kpi.id)
    return true
  }).map((kpi) => ({
    ambito: grupo.ambito,
    nombre: kpi.nombre,
    medida: textoMedidaKpi(kpi.actual == null ? null : Number(kpi.actual), kpi.meta == null ? null : Number(kpi.meta), kpi.unidad),
    estado: kpi.estadoMeta === "EN_LINEA_BASE" ? "En línea base" : META_LABEL[kpi.estadoMeta],
  })))
}

export async function armarInforme(actor: Actor, filtros: { semana?: string; area?: string; proyectoId?: string }): Promise<InformePdf> {
  const corte = semanaDe(filtros.semana)
  const visibles = await listarProyectos(actor)
  const ids = visibles
    .filter((item) => !filtros.area || item.team === filtros.area)
    .filter((item) => !filtros.proyectoId || item.id === filtros.proyectoId)
    .map((item) => item.id)
  const proyectos = await prisma.proyecto.findMany({
    where: { id: { in: ids } },
    include: {
      entregables: { orderBy: { orden: "asc" } },
      tasks: { include: { kpiEnlace: true } },
      objetivo: { include: { kpis: true } },
    },
  })
  const areas = [...new Set(proyectos.map((proyecto) => proyecto.team).filter((team): team is NonNullable<typeof team> => Boolean(team)))]
  const kpisArea = areas.length === 0 ? [] : await prisma.kpi.findMany({ where: { area: { in: areas } } })
  const piezas = proyectos.map((proyecto) => {
    const actividades = proyecto.tasks.map((tarea) => ({
      hecha: tarea.status === "HECHA",
      horasEstimadas: Number(tarea.horasEstimadas || 0),
      horasReales: Number(tarea.horasReales || 0),
      parentId: tarea.parentId,
    }))
    const totales = totalesPlan(actividades)
    const raices = proyecto.tasks.filter((tarea) => !tarea.parentId)
    const fecha = proyecto.targetAt.toISOString().slice(0, 10)
    const estado = CUMPLIMIENTO_LABEL[cumplimientoFecha(fecha, totales.cumplimiento, corte.hasta.toISODate() || fecha)]
    const enSemana = (valor: Date | null) => {
      if (!valor) return false
      const instante = DateTime.fromJSDate(valor).setZone("America/Bogota")
      return instante >= corte.desde && instante <= corte.hasta
    }
    const vinculados = proyecto.tasks.flatMap((tarea) => tarea.kpiEnlace ? [tarea.kpiEnlace] : []).filter((kpi, indice, lista) => lista.findIndex((otro) => otro.id === kpi.id) === indice)
    return {
      nombre: proyecto.name,
      area: etiquetaArea(proyecto.team, proyecto.description),
      porcentaje: totales.cumplimiento,
      estado,
      horasEstimadas: totales.estimadas,
      horasReales: totales.reales,
      entregables: proyecto.entregables.map((entregable) => {
        const suyas = raices.filter((tarea) => tarea.entregableId === entregable.id)
        const avance = porcentajeEntregable(suyas.map((tarea) => ({ hecha: tarea.status === "HECHA" })))
        const dia = entregable.fechaCompromiso?.toISOString().slice(0, 10) || null
        return { nombre: entregable.nombre, porcentaje: avance, estado: CUMPLIMIENTO_LABEL[cumplimientoFecha(dia, avance, corte.hasta.toISODate() || fecha)], fecha: dia || "" }
      }),
      hechasSemana: proyecto.tasks.filter((tarea) => tarea.status === "HECHA" && enSemana(tarea.completedAt)).map((tarea) => tarea.title),
      planeadas: proyecto.tasks.filter((tarea) => enSemana(tarea.dueDate)).map((tarea) => tarea.title),
      vencidas: proyecto.tasks.filter((tarea) => tarea.status !== "HECHA" && tarea.dueDate && tarea.dueDate < corte.desde.toJSDate()).map((tarea) => tarea.title),
      kpisVinculados: vinculados.map((kpi) => ({
        nombre: kpi.nombre,
        medida: textoMedidaKpi(kpi.actual == null ? null : Number(kpi.actual), kpi.meta == null ? null : Number(kpi.meta), kpi.unidad),
      })),
    }
  })
  const corteFilas = proyectos.flatMap((proyecto) => proyecto.tasks.map((tarea) => ({
    hecha: tarea.status === "HECHA",
    horasEstimadas: Number(tarea.horasEstimadas || 0),
    horasReales: Number(tarea.horasReales || 0),
    parentId: tarea.parentId,
  })))
  const general = totalesPlan(corteFilas)
  const estados = piezas.map((item) => item.estado)
  const kpis = kpisPorAmbito([
    ...proyectos.filter((proyecto) => proyecto.objetivo).map((proyecto) => ({ ambito: proyecto.objetivo?.titulo || proyecto.name, kpis: proyecto.objetivo?.kpis ?? [] })),
    ...areas.map((area) => ({ ambito: etiquetaArea(area, ""), kpis: kpisArea.filter((kpi) => kpi.area === area) })),
  ])
  return {
    semana: corte.clave,
    desde: corte.desde.toFormat("dd/MM/yyyy"),
    hasta: corte.hasta.toFormat("dd/MM/yyyy"),
    formula: TEXTO_CUMPLIMIENTO,
    cumplimiento: general.cumplimiento,
    aTiempo: estados.filter((item) => item === "A tiempo").length,
    enRiesgo: estados.filter((item) => item === "En riesgo").length,
    vencidos: estados.filter((item) => item === "Vencido").length,
    proyectos: piezas,
    kpis,
  }
}
