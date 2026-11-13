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
    mine: one("mine") === "1",
    assignedToMe: one("assigned") === "1",
    from: one("from"),
    to: one("to"),
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
