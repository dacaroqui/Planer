"use server"

import { revalidatePath } from "next/cache"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { ESTADOS_TAREA, type EstadoTareaPlan } from "@/lib/plan-trabajo"
import { requireActor } from "@/server/session"
import { crearActividadPlan, crearProyectoPlan, editarFilaPlan } from "@/server/plan-trabajo"

export type ResultadoPlan = { ok: true; message: string } | { ok: false; error: string }

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
    await crearActividadPlan(actor, {
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
    })
    revalidatePath("/plan")
    revalidatePath("/planner")
    revalidatePath("/proyectos")
    return { ok: true, message: "Actividad agregada." }
  } catch (error) {
    return fallo(error)
  }
}

export async function crearProyectoPlanAction(formData: FormData): Promise<ResultadoPlan> {
  const actor = await requireActor()
  try {
    await crearProyectoPlan(actor, {
      name: String(formData.get("name") || ""),
      team: String(formData.get("team") || ""),
      startsAt: String(formData.get("startsAt") || ""),
      targetAt: String(formData.get("targetAt") || ""),
      empresaId: String(formData.get("empresaId") || ""),
    })
    revalidatePath("/plan")
    revalidatePath("/proyectos")
    return { ok: true, message: "Proyecto creado." }
  } catch (error) {
    return fallo(error)
  }
}
