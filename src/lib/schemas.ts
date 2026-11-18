import { z } from "zod"
import { TEAMS } from "@/lib/domain"

export const radicarSchema = z.object({
  title: z.string().trim().min(5, "El título debe tener entre 5 y 120 caracteres.").max(120, "El título admite máximo 120 caracteres."),
  description: z.string().trim().min(20, "La descripción debe tener al menos 20 caracteres.").max(8000, "La descripción es demasiado larga."),
  team: z.enum(TEAMS, { error: "Elija el área antes de continuar." }),
  typeId: z.string().min(1, "Elija un tipo de requerimiento."),
  priority: z.string().min(1, "Elija la prioridad sugerida."),
  brand: z.string().min(1, "Elija la marca."),
  justification: z.string().trim().max(2000).optional(),
  desiredDate: z.string().trim().optional(),
  stepsToReproduce: z.string().trim().max(4000).optional(),
  channels: z.string().trim().max(300).optional(),
  publishAt: z.string().trim().optional(),
  moduleName: z.string().trim().max(120).optional(),
  declares: z.literal("1", { error: "Confirme que este requerimiento no contiene datos personales sensibles." }),
  reviewedPersonalData: z.string().optional(),
})

export const commentSchema = z.object({
  body: z.string().trim().min(2, "Escriba un comentario.").max(4000, "El comentario es demasiado largo."),
  internal: z.boolean(),
})

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revise los datos del formulario."
}
