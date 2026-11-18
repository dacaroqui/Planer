import { prisma } from "@/lib/prisma"
import { etiquetaTarea, type PiezaParaTi } from "@/lib/para-ti"
import { evaluarSla } from "@/server/requests"

export async function tareasAsignadas(actorId: string): Promise<PiezaParaTi[]> {
  const filas = await prisma.tarea.findMany({
    where: { assigneeId: actorId, status: { not: "HECHA" } },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      assignee: { select: { name: true } },
      project: { select: { id: true, name: true, empresa: { select: { name: true } } } },
      request: {
        select: {
          code: true,
          brand: true,
          status: true,
          slaStartedAt: true,
          slaTargetMinutes: true,
          resolutionMinutes: true,
          resolvedAt: true,
          firstResponseMinutes: true,
          firstResponseDueAt: true,
          firstResponseStoppedAt: true,
          firstResponseMet: true,
          empresa: { select: { name: true } },
          pauses: { select: { startedAt: true, endedAt: true } },
        },
      },
    },
  })
  return filas.map((tarea) => {
    const sla = tarea.request ? evaluarSla(tarea.request).state : "NO_APLICA"
    const href = tarea.request
      ? `/requerimientos/${tarea.request.code}`
      : tarea.project
        ? `/proyectos/${tarea.project.id}`
        : `/panel?tab=asignaciones`
    return {
      code: tarea.request?.code ?? tarea.id,
      title: tarea.title,
      tipo: "Tarea",
      espacio: tarea.request?.empresa.name ?? tarea.project?.empresa.name ?? tarea.project?.name ?? "Sin espacio",
      asignado: tarea.assignee?.name ?? null,
      marca: tarea.request?.brand ?? "",
      actualizado: tarea.updatedAt.toISOString(),
      assigneeId: actorId,
      estado: tarea.status,
      estadoEtiqueta: etiquetaTarea(tarea.status),
      sla,
      href,
    }
  })
}
