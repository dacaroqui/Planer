import type { ListQuery } from "@/server/requests"
import type { Actor } from "@/lib/domain"

export function consultaDesde(
  params: Record<string, string | string[] | undefined>,
  actor: Actor,
  extra: Partial<ListQuery> = {},
): ListQuery {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const page = Number(one("page") || 1)
  return {
    q: one("q") || undefined,
    team: one("team"),
    status: one("status"),
    priority: one("priority"),
    brand: one("brand"),
    empresaId: one("empresa"),
    projectId: one("proyecto"),
    typeId: one("tipo"),
    requesterId: one("solicitante"),
    areaId: one("area"),
    mine: one("mine") === "1",
    assignedToMe: one("assigned") === "1",
    unassigned: one("sin") === "1",
    from: one("from"),
    to: one("to"),
    sla: one("sla"),
    porActualizacion: one("fecha") === "actualizacion",
    pageSize: Number(one("pageSize")) || undefined,
    sort: one("sort"),
    dir: one("dir") === "asc" ? "asc" : one("dir") === "desc" ? "desc" : undefined,
    page: Number.isFinite(page) ? page : 1,
    ...extra,
    ...(extra.queueTeam ? { queueTeam: extra.queueTeam } : {}),
  }
}

export function queryString(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const item = Array.isArray(value) ? value[0] : value
    if (item && key !== "page") search.set(key, item)
  }
  return search.toString()
}
