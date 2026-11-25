"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DomainError, PermisoDenegado } from "@/lib/domain"
import { requireActor } from "@/server/session"
import { ajustarKpi, aprobarMeta, asignarProyecto, guardarKpi, guardarObjetivo, moverProyectoAObjetivo, proponerMeta, registrarMedicion, vincularExperimento } from "@/server/objetivos"

function fallo(error: unknown): never {
  if (error instanceof PermisoDenegado || error instanceof DomainError) throw error
  console.error(error)
  throw new DomainError("No se pudo guardar.")
}

function refrescar() {
  revalidatePath("/objetivos")
  revalidatePath("/kpis/areas")
  revalidatePath("/kpis/personas")
  revalidatePath("/kpis/mios")
  revalidatePath("/proyectos")
  revalidatePath("/growth")
}

export async function guardarObjetivoAction(formData: FormData) {
  const actor = await requireActor()
  const estado = String(formData.get("estado") || "ABIERTO")
  try {
    await guardarObjetivo(actor, {
      id: String(formData.get("id") || "") || undefined,
      marca: String(formData.get("marca") || "CIFES"),
      titulo: String(formData.get("titulo") || ""),
      descripcion: String(formData.get("descripcion") || ""),
      area: String(formData.get("area") || ""),
      duenoId: String(formData.get("duenoId") || actor.id),
      periodoInicio: String(formData.get("periodoInicio") || ""),
      periodoFin: String(formData.get("periodoFin") || ""),
      costoTope: String(formData.get("costoTope") || ""),
      estado: estado === "EN_CURSO" || estado === "CERRADO" ? estado : "ABIERTO",
    })
  } catch (error) {
    fallo(error)
  }
  refrescar()
  redirect("/objetivos")
}

export async function guardarKpiAction(formData: FormData) {
  const actor = await requireActor()
  const nivel = String(formData.get("nivel") || "persona")
  const frecuencia = String(formData.get("frecuencia") || "MENSUAL")
  const tipo = String(formData.get("tipo") || "APOYO")
  try {
    await guardarKpi(actor, {
      id: String(formData.get("id") || "") || undefined,
      nombre: String(formData.get("nombre") || ""),
      descripcion: String(formData.get("descripcion") || ""),
      unidad: String(formData.get("unidad") || ""),
      lineaBase: String(formData.get("lineaBase") || ""),
      meta: String(formData.get("meta") || ""),
      actual: String(formData.get("actual") || ""),
      fuente: String(formData.get("fuente") || ""),
      frecuencia: frecuencia === "SEMANAL" || frecuencia === "QUINCENAL" ? frecuencia : "MENSUAL",
      tipo: tipo === "PRINCIPAL" ? "PRINCIPAL" : "APOYO",
      nivel: nivel === "objetivo" || nivel === "area" ? nivel : "persona",
      objetivoId: String(formData.get("objetivoId") || ""),
      area: String(formData.get("area") || ""),
      personaId: String(formData.get("personaId") || ""),
      apoyaId: String(formData.get("apoyaId") || ""),
      bloqueado: formData.get("bloqueado") === "1",
      motivoBloqueo: String(formData.get("motivoBloqueo") || ""),
    })
  } catch (error) {
    fallo(error)
  }
  refrescar()
  redirect(String(formData.get("volver") || "/kpis/mios"))
}

export async function medicionAction(formData: FormData) {
  const actor = await requireActor()
  try {
    await registrarMedicion(actor, {
      kpiId: String(formData.get("kpiId") || ""),
      valor: String(formData.get("valor") || ""),
      nota: String(formData.get("nota") || ""),
      fecha: String(formData.get("fecha") || ""),
    })
  } catch (error) {
    fallo(error)
  }
  refrescar()
}

export async function proponerMetaAction(formData: FormData) {
  const actor = await requireActor()
  try {
    await proponerMeta(actor, { kpiId: String(formData.get("kpiId") || ""), meta: String(formData.get("meta") || "") })
  } catch (error) {
    fallo(error)
  }
  refrescar()
}

export async function aprobarMetaAction(formData: FormData) {
  const actor = await requireActor()
  try {
    await aprobarMeta(actor, String(formData.get("kpiId") || ""))
  } catch (error) {
    fallo(error)
  }
  refrescar()
}

export async function moverProyectoObjetivoAction(input: { proyectoId: string; objetivoId: string }) {
  const actor = await requireActor()
  try {
    await moverProyectoAObjetivo(actor, input)
  } catch (error) {
    if (error instanceof PermisoDenegado || error instanceof DomainError) return { ok: false as const, error: error.message }
    console.error(error)
    return { ok: false as const, error: "No se pudo mover el proyecto." }
  }
  refrescar()
  return { ok: true as const }
}

export async function ajustarKpiAction(input: { id: string; actual?: string; meta?: string }) {
  const actor = await requireActor()
  try {
    await ajustarKpi(actor, input)
  } catch (error) {
    if (error instanceof PermisoDenegado || error instanceof DomainError) return { ok: false as const, error: error.message }
    console.error(error)
    return { ok: false as const, error: "No se pudo guardar el KPI." }
  }
  refrescar()
  return { ok: true as const }
}

export async function asignarProyectoAction(formData: FormData) {
  const actor = await requireActor()
  try {
    await asignarProyecto(actor, {
      proyectoId: String(formData.get("proyectoId") || ""),
      objetivoId: String(formData.get("objetivoId") || ""),
      fase: String(formData.get("fase") || ""),
      medio: String(formData.get("medio") || ""),
      costo: String(formData.get("costo") || ""),
    })
  } catch (error) {
    fallo(error)
  }
  refrescar()
}

export async function vincularExperimentoAction(formData: FormData) {
  const actor = await requireActor()
  try {
    await vincularExperimento(actor, {
      id: String(formData.get("id") || ""),
      objetivoId: String(formData.get("objetivoId") || ""),
      kpiId: String(formData.get("kpiId") || ""),
    })
  } catch (error) {
    fallo(error)
  }
  revalidatePath("/growth")
}
