"use server"

import { revalidatePath } from "next/cache"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { ESTADOS_TAREA, type EstadoTareaPlan } from "@/lib/plan-trabajo"
import { requireActor } from "@/server/session"
import { editarFilaPlan } from "@/server/plan-trabajo"

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
    await editarFilaPlan(actor, {
      id: String(formData.get("id") || ""),
      status: ESTADOS_TAREA.includes(estado as EstadoTareaPlan) ? estado as EstadoTareaPlan : undefined,
      assigneeId: String(formData.get("assigneeId") || "") || null,
      bloqueo: String(formData.get("bloqueo") ?? ""),
    })
    revalidatePath("/plan")
    revalidatePath("/planner")
    return { ok: true, message: "Fila actualizada." }
  } catch (error) {
    return fallo(error)
  }
}
