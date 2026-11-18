import { assertAllowedFile } from "@/lib/files"
import { firstIssue, radicarSchema } from "@/lib/schemas"
import { DomainError, type Actor } from "@/lib/domain"
import { adjuntar, radicar } from "@/server/requests"

export type ResultadoRadicacion = { ok: true; code: string } | { ok: false; error: string }

function fallo(error: unknown): ResultadoRadicacion {
  if (error instanceof DomainError) return { ok: false, error: error.message }
  console.error(error)
  return { ok: false, error: "No se pudo completar la acción." }
}

export async function radicarDesdeFormulario(actor: Actor, formData: FormData): Promise<ResultadoRadicacion> {
  const parsed = radicarSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    expectedResult: formData.get("expectedResult"),
    team: formData.get("team"),
    typeId: formData.get("typeId"),
    priority: formData.get("priority"),
    brand: formData.get("brand"),
    desiredDate: String(formData.get("desiredDate") || "") || undefined,
    justification: String(formData.get("justification") || "") || undefined,
    stepsToReproduce: String(formData.get("stepsToReproduce") || "") || undefined,
    channels: String(formData.get("channels") || "") || undefined,
    publishAt: String(formData.get("publishAt") || "") || undefined,
    moduleName: String(formData.get("moduleName") || "") || undefined,
    reviewedPersonalData: formData.get("reviewedPersonalData") || undefined,
    declares: formData.get("declares"),
  })
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) }

  const subidos = formData.getAll("archivo").filter((item): item is File => item instanceof File && item.size > 0)
  const files: { name: string; type: string; bytes: Buffer }[] = []
  for (const uploaded of subidos) {
    const bytes = Buffer.from(await uploaded.arrayBuffer())
    try {
      assertAllowedFile(uploaded.name, bytes.length, uploaded.type)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Archivo inválido." }
    }
    files.push({ name: uploaded.name, type: uploaded.type, bytes })
  }

  try {
    const request = await radicar(actor, {
      ...parsed.data,
      justification: parsed.data.justification,
      stepsToReproduce: parsed.data.stepsToReproduce,
      channels: parsed.data.channels,
      publishAt: parsed.data.publishAt,
      declares: parsed.data.declares === "1",
      reviewedPersonalData: parsed.data.reviewedPersonalData === "1",
      empresaId: String(formData.get("empresaId") || "") || undefined,
      projectId: String(formData.get("projectId") || "") || null,
      areaId: String(formData.get("areaId") || "") || undefined,
      assigneeId: String(formData.get("assigneeId") || "") || null,
    })
    for (const file of files) await adjuntar(actor, request.id, file)
    return { ok: true, code: request.code }
  } catch (error) {
    return fallo(error)
  }
}
