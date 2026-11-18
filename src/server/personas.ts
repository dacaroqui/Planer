import { Prisma } from "@prisma/client"
import { SLA_LABEL, TEAM_LABEL, TERMINAL_STATUSES, statusLabel, type Actor, type TeamName } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { tareaVencida } from "@/lib/avance"
import { evaluarSla } from "@/server/requests"

export type ItemPersona = {
  id: string
  clave: string
  resumen: string
  estado: string
  etiqueta: string
  sla: string | null
  href: string | null
  vencido: boolean
  tipo: "requerimiento" | "tarea"
}

export type FilaPersona = {
  id: string
  nombre: string
  area: string
  equipos: string
  abiertos: number
  tareas: number
  vencidos: number
  items: ItemPersona[]
}

export async function listarPersonas(
  actor: Actor,
  filtros: { espacio?: string; equipo?: TeamName; area?: string; soloVacias?: boolean; persona?: string },
) {
  const and: Prisma.UserWhereInput[] = [{ active: true }]
  if (filtros.persona) and.push({ id: filtros.persona })
  if (filtros.area) and.push({ areaId: filtros.area })
  if (filtros.equipo) and.push({ areaRoles: { some: { team: filtros.equipo } } })
  if (!esAdmin(actor)) {
    const teams = actor.memberships.map((item) => item.team)
    and.push(teams.length
      ? { OR: [{ id: actor.id }, { areaRoles: { some: { team: { in: teams } } } }] }
      : { id: actor.id })
  }
  const usuarios = await prisma.user.findMany({
    where: { AND: and },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      area: { select: { name: true } },
      areaRoles: { select: { team: true, role: true } },
    },
  })
  const ids = usuarios.map((item) => item.id)
  if (ids.length === 0) return []
  const [requerimientos, tareas] = await Promise.all([
    prisma.request.findMany({
      where: {
        assigneeId: { in: ids },
        status: { notIn: [...TERMINAL_STATUSES] },
        ...(filtros.espacio ? { empresaId: filtros.espacio } : {}),
      },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        assigneeId: true,
        slaStartedAt: true,
        slaTargetMinutes: true,
        resolutionMinutes: true,
        resolvedAt: true,
        pauses: { select: { startedAt: true, endedAt: true } },
      },
    }),
    prisma.tarea.findMany({
      where: {
        assigneeId: { in: ids },
        status: { not: "HECHA" },
        ...(filtros.espacio ? {
          OR: [
            { request: { empresaId: filtros.espacio } },
            { project: { empresaId: filtros.espacio } },
          ],
        } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assigneeId: true,
        request: { select: { code: true } },
      },
    }),
  ])
  const filas = usuarios.map((usuario) => {
    const suyos = requerimientos.filter((item) => item.assigneeId === usuario.id)
    const susTareas = tareas.filter((item) => item.assigneeId === usuario.id)
    const items: ItemPersona[] = [
      ...suyos.map((item) => {
        const sla = evaluarSla(item)
        return {
          id: item.id,
          clave: item.code,
          resumen: item.title,
          estado: item.status,
          etiqueta: statusLabel(item.status),
          sla: SLA_LABEL[sla.state],
          href: `/requerimientos/${item.code}`,
          vencido: sla.state === "VENCIDO",
          tipo: "requerimiento" as const,
        }
      }),
      ...susTareas.map((item) => ({
        id: item.id,
        clave: item.request?.code ?? "Tarea",
        resumen: item.title,
        estado: item.status,
        etiqueta: item.status === "EN_CURSO" ? "En curso" : "Pendiente",
        sla: null,
        href: item.request ? `/requerimientos/${item.request.code}` : null,
        vencido: tareaVencida(item),
        tipo: "tarea" as const,
      })),
    ]
    const equipos = [...new Set(usuario.areaRoles.filter((item) => item.role === "AGENTE" || item.role === "LIDER").map((item) => TEAM_LABEL[item.team]))]
    return {
      id: usuario.id,
      nombre: usuario.name,
      area: usuario.area.name,
      equipos: equipos.join(", ") || "Sin equipo",
      abiertos: suyos.length,
      tareas: susTareas.length,
      vencidos: items.filter((item) => item.vencido).length,
      items,
    }
  })
  return filtros.soloVacias ? filas.filter((fila) => fila.abiertos + fila.tareas === 0) : filas
}
