import { z } from "zod"

export const radicarSchema = z.object({
  title: z.string().trim().min(8, "El título debe tener al menos 8 caracteres.").max(140, "El título admite máximo 140 caracteres."),
  description: z.string().trim().min(20, "Describa el requerimiento con al menos 20 caracteres.").max(5000, "La descripción es demasiado larga."),
  expectedResult: z.string().trim().min(8, "Indique el resultado esperado.").max(2000, "El resultado esperado es demasiado largo."),
  team: z.enum(["DESARROLLO", "MARKETING"], { error: "Elija el equipo destino." }),
  typeId: z.string().min(1, "Elija un tipo de requerimiento."),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"], { error: "Elija la prioridad." }),
  brand: z.enum(["CIFES", "LUVANIA", "AMBAS"], { error: "Elija la marca." }),
  desiredDate: z.string().trim().optional(),
})

export const commentSchema = z.object({
  body: z.string().trim().min(2, "Escriba un comentario.").max(4000, "El comentario es demasiado largo."),
  internal: z.boolean(),
})

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revise los datos del formulario."
}
