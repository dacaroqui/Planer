import { DateTime } from "luxon"
import { prisma } from "@/lib/prisma"
import { CUMPLIMIENTO_LABEL, cumplimientoFecha, porcentajeEntregable, porcentajeProyecto } from "@/lib/entregables"
import { META_LABEL } from "@/lib/objetivos"
import type { InformePdf } from "@/lib/informe-pdf"
import { etiquetaArea, textoMedidaKpi } from "@/lib/plan-trabajo"
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
      tasks: true,
      objetivo: { include: { kpis: true } },
    },
  })
  const piezas = proyectos.map((proyecto) => {
    const actividades = proyecto.tasks.filter((tarea) => !tarea.parentId)
    const porcentaje = porcentajeProyecto(actividades.map((tarea) => ({ hecha: tarea.status === "HECHA" })))
    const fecha = proyecto.targetAt.toISOString().slice(0, 10)
    const estado = CUMPLIMIENTO_LABEL[cumplimientoFecha(fecha, porcentaje, corte.hasta.toISODate() || fecha)]
    const enSemana = (valor: Date | null) => {
      if (!valor) return false
      const instante = DateTime.fromJSDate(valor).setZone("America/Bogota")
      return instante >= corte.desde && instante <= corte.hasta
    }
    return {
      nombre: proyecto.name,
      area: etiquetaArea(proyecto.team, proyecto.description),
      porcentaje,
      estado,
      horasEstimadas: actividades.reduce((total, tarea) => total + Number(tarea.horasEstimadas || 0), 0),
      horasReales: actividades.reduce((total, tarea) => total + Number(tarea.horasReales || 0), 0),
      entregables: proyecto.entregables.map((entregable) => {
        const suyas = actividades.filter((tarea) => tarea.entregableId === entregable.id)
        const avance = porcentajeEntregable(suyas.map((tarea) => ({ hecha: tarea.status === "HECHA" })))
        const dia = entregable.fechaCompromiso?.toISOString().slice(0, 10) || null
        return { nombre: entregable.nombre, porcentaje: avance, estado: CUMPLIMIENTO_LABEL[cumplimientoFecha(dia, avance, corte.hasta.toISODate() || fecha)], fecha: dia || "" }
      }),
      hechasSemana: actividades.filter((tarea) => tarea.status === "HECHA" && enSemana(tarea.completedAt)).map((tarea) => tarea.title),
      planeadas: actividades.filter((tarea) => enSemana(tarea.dueDate)).map((tarea) => tarea.title),
      vencidas: actividades.filter((tarea) => tarea.status !== "HECHA" && tarea.dueDate && tarea.dueDate < corte.desde.toJSDate()).map((tarea) => tarea.title),
      kpis: proyecto.objetivo?.kpis ?? [],
    }
  })
  const estados = piezas.map((item) => item.estado)
  const kpis = piezas.flatMap((proyecto) => proyecto.kpis.map((kpi) => ({
    nombre: kpi.nombre,
    ambito: proyecto.nombre,
    medida: textoMedidaKpi(kpi.actual == null ? null : Number(kpi.actual), kpi.meta == null ? null : Number(kpi.meta), kpi.unidad),
    estado: kpi.estadoMeta === "EN_LINEA_BASE" ? "En línea base" : META_LABEL[kpi.estadoMeta],
  })))
  return {
    semana: corte.clave,
    desde: corte.desde.toFormat("dd/MM/yyyy"),
    hasta: corte.hasta.toFormat("dd/MM/yyyy"),
    cumplimiento: piezas.length ? Math.round(piezas.reduce((total, item) => total + item.porcentaje, 0) / piezas.length) : 0,
    aTiempo: estados.filter((item) => item === "A tiempo").length,
    enRiesgo: estados.filter((item) => item === "En riesgo").length,
    vencidos: estados.filter((item) => item === "Vencido").length,
    proyectos: piezas.map(({ kpis: omitidos, ...resto }) => { void omitidos; return resto }),
    kpis,
  }
}
