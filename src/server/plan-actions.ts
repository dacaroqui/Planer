"use server"

import { revalidatePath } from "next/cache"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { ESTADOS_TAREA, type EstadoTareaPlan } from "@/lib/plan-trabajo"
import { requireActor } from "@/server/session"
import { asignarEntregable, crearActividadPlan, crearEntregable, crearKpiPlan, crearProyectoPlan, deshacerAlta, editarFilaPlan, editarMasivo, eliminarActividadPlan, moverActividad, renombrarEntregable, reordenarActividades, restaurarActividadPlan, vincularKpiActividad, type FotoActividad } from "@/server/plan-trabajo"

export type ResultadoPlan = { ok: true; message: string; id?: string } | { ok: false; error: string }

function refrescarPlan() {
  revalidatePath("/plan")
  revalidatePath("/planner")
  revalidatePath("/proyectos")
  revalidatePath("/informes")
}

function fallo(error: unknown): ResultadoPlan {
  if (error instanceof PermisoDenegado || error instanceof DomainError) return { ok: false, error: error.message }
  console.error(error)
  return { ok: false, error: "No se pudo guardar la fila." }
}

export async function editarPlanAction(formData: FormData): Promise<ResultadoPlan> {
  const actor = await requireActor()
  const estado = String(formData.get("status") || "")
  try {
    const texto = (nombre: string) => (formData.has(nombre) ? String(formData.get(nombre) ?? "") : undefined)
    await editarFilaPlan(actor, {
      id: String(formData.get("id") || ""),
      status: ESTADOS_TAREA.includes(estado as EstadoTareaPlan) ? estado as EstadoTareaPlan : undefined,
      assigneeId: formData.has("assigneeId") ? String(formData.get("assigneeId") || "") || null : undefined,
      bloqueo: texto("bloqueo"),
      participantes: texto("participantes"),
      fechaInicio: texto("fechaInicio"),
      fechaFin: texto("fechaFin"),
      horasEstimadas: texto("horasEstimadas"),
      horasReales: texto("horasReales"),
      kpiNombre: texto("kpiNombre"),
      kpiMeta: texto("kpiMeta"),
      kpiUnidad: texto("kpiUnidad"),
      kpiActual: texto("kpiActual"),
      soloAvance: formData.get("soloAvance") === "1",
    })
    revalidatePath("/plan")
    revalidatePath("/planner")
    revalidatePath("/proyectos")
    return { ok: true, message: "Fila actualizada." }
  } catch (error) {
    return fallo(error)
  }
}

export async function crearActividadAction(formData: FormData): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    const tarea = await crearActividadPlan(actor, {
      proyectoId: String(formData.get("proyectoId") || ""),
      titulo: String(formData.get("titulo") || ""),
      assigneeId: String(formData.get("assigneeId") || "") || null,
      participantes: String(formData.get("participantes") || ""),
      fechaInicio: String(formData.get("fechaInicio") || ""),
      fechaFin: String(formData.get("fechaFin") || ""),
      horasEstimadas: String(formData.get("horasEstimadas") || ""),
      kpiNombre: String(formData.get("kpiNombre") || ""),
      kpiMeta: String(formData.get("kpiMeta") || ""),
      kpiUnidad: String(formData.get("kpiUnidad") || ""),
      kpiActual: String(formData.get("kpiActual") || ""),
      bloqueo: String(formData.get("bloqueo") || ""),
      entregableId: String(formData.get("entregableId") || "") || null,
      parentId: String(formData.get("parentId") || "") || null,
    })
    revalidatePath("/plan")
    revalidatePath("/planner")
    revalidatePath("/proyectos")
    return { ok: true, message: "Actividad agregada.", id: tarea.id }
  } catch (error) {
    return fallo(error)
  }
}

export async function crearProyectoPlanAction(formData: FormData): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    const creado = await crearProyectoPlan(actor, {
      name: String(formData.get("name") || ""),
      team: String(formData.get("team") || ""),
      startsAt: String(formData.get("startsAt") || ""),
      targetAt: String(formData.get("targetAt") || ""),
      empresaId: String(formData.get("empresaId") || ""),
    })
    revalidatePath("/plan")
    revalidatePath("/proyectos")
    return { ok: true, message: "Proyecto creado.", id: creado.id }
  } catch (error) {
    return fallo(error)
  }
}

export async function crearEntregableAction(input: { proyectoId: string; nombre: string; fecha?: string | null }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    const creado = await crearEntregable(actor, input)
    revalidatePath("/plan")
    return { ok: true, message: "Entregable creado.", id: creado.id }
  } catch (error) {
    return fallo(error)
  }
}

export async function renombrarEntregableAction(input: { id: string; nombre: string; fecha?: string | null }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await renombrarEntregable(actor, input)
    revalidatePath("/plan")
    return { ok: true, message: "Entregable actualizado." }
  } catch (error) {
    return fallo(error)
  }
}

export async function asignarEntregableAction(input: { id: string; entregableId: string | null }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await asignarEntregable(actor, input)
    refrescarPlan()
    return { ok: true, message: "Actividad movida." }
  } catch (error) {
    return fallo(error)
  }
}

export async function vincularKpiAction(input: { id: string; kpiId: string | null }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await vincularKpiActividad(actor, input)
    refrescarPlan()
    return { ok: true, message: "KPI vinculado." }
  } catch (error) {
    return fallo(error)
  }
}

export async function guardarCeldaAction(input: {
  id: string
  title?: string
  status?: string
  assigneeId?: string | null
  bloqueo?: string | null
  participantes?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
  horasEstimadas?: string | null
  horasReales?: string | null
  kpiNombre?: string | null
  kpiMeta?: string | null
  kpiUnidad?: string | null
  kpiActual?: string | null
  projectId?: string
  parentId?: string | null
}): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await editarFilaPlan(actor, {
      id: input.id,
      title: input.title,
      status: ESTADOS_TAREA.includes(input.status as EstadoTareaPlan) ? input.status as EstadoTareaPlan : undefined,
      assigneeId: input.assigneeId,
      bloqueo: input.bloqueo,
      participantes: input.participantes,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      horasEstimadas: input.horasEstimadas,
      horasReales: input.horasReales,
      kpiNombre: input.kpiNombre,
      kpiMeta: input.kpiMeta,
      kpiUnidad: input.kpiUnidad,
      kpiActual: input.kpiActual,
      projectId: input.projectId,
      parentId: input.parentId,
    })
    refrescarPlan()
    return { ok: true, message: "Cambio guardado." }
  } catch (error) {
    return fallo(error)
  }
}

export async function reordenarPlanAction(ids: string[]): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await reordenarActividades(actor, ids)
    refrescarPlan()
    return { ok: true, message: "Orden actualizado." }
  } catch (error) {
    return fallo(error)
  }
}

export async function moverActividadAction(input: { id: string; projectId: string; parentId: string | null }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await moverActividad(actor, input)
    revalidatePath("/plan")
    revalidatePath("/proyectos")
    revalidatePath("/objetivos")
    return { ok: true, message: "Actividad movida." }
  } catch (error) {
    return fallo(error)
  }
}

export async function editarMasivoAction(input: { ids: string[]; assigneeId?: string | null; status?: string; fechaInicio?: string | null; fechaFin?: string | null; projectId?: string }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await editarMasivo(actor, {
      ids: input.ids,
      assigneeId: input.assigneeId,
      status: ESTADOS_TAREA.includes(input.status as EstadoTareaPlan) ? input.status as EstadoTareaPlan : undefined,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      projectId: input.projectId,
    })
    revalidatePath("/plan")
    revalidatePath("/proyectos")
    return { ok: true, message: "Actividades actualizadas." }
  } catch (error) {
    return fallo(error)
  }
}

export async function deshacerAltaAction(id: string): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await deshacerAlta(actor, id)
    refrescarPlan()
    return { ok: true, message: "Alta deshecha." }
  } catch (error) {
    return fallo(error)
  }
}

export async function crearKpiPlanAction(input: { tareaId: string; nombre: string; meta?: string; unidad?: string }) {
  const actor = await requireActor()
  try {
    const kpi = await crearKpiPlan(actor, input)
    refrescarPlan()
    return { ok: true as const, kpi }
  } catch (error) {
    return fallo(error)
  }
}

export async function eliminarActividadPlanAction(input: { id: string; subtareas: "borrar" | "soltar" }) {
  const actor = await requireActor()
  try {
    const borrado = await eliminarActividadPlan(actor, input)
    refrescarPlan()
    return { ok: true as const, ...borrado }
  } catch (error) {
    return fallo(error)
  }
}

export async function restaurarActividadPlanAction(input: { foto: FotoActividad; hijas: FotoActividad[] }): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await restaurarActividadPlan(actor, input)
    refrescarPlan()
    return { ok: true, message: "Actividad restaurada." }
  } catch (error) {
    return fallo(error)
  }
}
