function hostDe(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.includes("*")) return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "")
  try {
    if (trimmed.includes("://")) return new URL(trimmed).host
  } catch {
    return trimmed
  }
  return trimmed
}

export function origenesPermitidos(env: Record<string, string | undefined> = process.env) {
  const hosts = new Set<string>()
  for (const value of [env.APP_URL, env.AUTH_URL, ...(env.ALLOWED_ORIGINS || "").split(",")]) {
    const host = hostDe(value || "")
    if (host) hosts.add(host)
  }
  return [...hosts]
}
