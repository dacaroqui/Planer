"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { requireActor } from "@/server/session"
import { avanzarExperimento, agregarEnlace, comentarExperimento, crearExperimento } from "@/server/growth"
import { prisma } from "@/lib/prisma"
import { puedeEditarGrowth } from "@/lib/growth"
import type { DecisionGrowth } from "@/lib/growth"

function fallo(error: unknown): never {
  if (error instanceof PermisoDenegado || error instanceof DomainError) throw error
  throw new DomainError("No se pudo completar la acción.")
}

export async function proponerExperimentoAction(formData: FormData) {
  const actor = await requireActor()
  let creado: { id: string }
  try {
    creado = await crearExperimento(actor, {
      nombre: String(formData.get("nombre") || ""),
      brand: String(formData.get("brand") || "LUVANIA"),
      cicloId: String(formData.get("cicloId") || ""),
      etapaEmbudo: String(formData.get("etapaEmbudo") || ""),
      metrica: String(formData.get("metrica") || ""),
      problema: String(formData.get("problema") || ""),
      donde: String(formData.get("donde") || ""),
      datos: String(formData.get("datos") || ""),
      explicacion: String(formData.get("explicacion") || ""),
      referencia: String(formData.get("referencia") || ""),
      mecanismo: String(formData.get("mecanismo") || ""),
      porque: String(formData.get("porque") || ""),
      valorInicial: String(formData.get("valorInicial") || ""),
      meta: String(formData.get("meta") || ""),
      comparacion: String(formData.get("comparacion") || ""),
      duracion: String(formData.get("duracion") || ""),
    })
    revalidatePath("/growth")
    redirect(`/growth/${creado.id}`)
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw error
    fallo(error)
  }
}

export async function avanzarExperimentoAction(formData: FormData) {
  const actor = await requireActor()
  const id = String(formData.get("id") || "")
  const decision = String(formData.get("decision") || "") as DecisionGrowth | ""
  try {
    await avanzarExperimento(actor, id, decision || null)
  } catch (error) {
    fallo(error)
  }
  revalidatePath(`/growth/${id}`)
  revalidatePath("/growth")
}

export async function comentarExperimentoAction(formData: FormData) {
  const actor = await requireActor()
  const id = String(formData.get("id") || "")
  try {
    await comentarExperimento(actor, id, String(formData.get("body") || ""))
  } catch (error) {
    fallo(error)
  }
  revalidatePath(`/growth/${id}`)
}

export async function enlaceExperimentoAction(formData: FormData) {
  const actor = await requireActor()
  const id = String(formData.get("id") || "")
  try {
    await agregarEnlace(actor, id, String(formData.get("titulo") || ""), String(formData.get("url") || ""))
  } catch (error) {
    fallo(error)
  }
  revalidatePath(`/growth/${id}`)
}

export async function tareaExperimentoAction(formData: FormData) {
  const actor = await requireActor()
  if (!puedeEditarGrowth(actor)) throw new PermisoDenegado("Su rol en Growth solo puede leer.")
  const id = String(formData.get("id") || "")
  const title = String(formData.get("title") || "").trim()
  if (title.length < 3) throw new DomainError("Indique el título de la tarea.")
  const projectId = String(formData.get("projectId") || "")
  if (!projectId) throw new DomainError("Toda actividad pertenece a un proyecto.")
  const experimento = await prisma.growthExperimento.findUnique({ where: { id } })
  if (!experimento) throw new DomainError("El experimento no existe.")
  const proyecto = await prisma.proyecto.findUnique({ where: { id: projectId } })
  if (!proyecto) throw new DomainError("Elija un proyecto.")
  await prisma.tarea.create({
    data: {
      title,
      status: "PENDIENTE",
      experimentoId: id,
      projectId,
      assigneeId: String(formData.get("assigneeId") || "") || null,
      dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null,
      createdById: actor.id,
    },
  })
  revalidatePath(`/growth/${id}`)
  revalidatePath("/planner")
}
