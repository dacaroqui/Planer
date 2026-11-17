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

export function urlsDePlataforma(env: Record<string, string | undefined>) {
  return [
    env.APP_URL,
    env.AUTH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "",
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "",
    env.URL,
    env.DEPLOY_PRIME_URL,
  ].filter((value): value is string => Boolean(value))
}

export function urlPublica(env: Record<string, string | undefined> = process.env) {
  const explicita = urlsDePlataforma(env)[0]
  if (explicita) return explicita.replace(/\/$/, "")
  return "http://127.0.0.1:38471"
}

export function origenesPermitidos(env: Record<string, string | undefined> = process.env) {
  const hosts = new Set<string>()
  for (const value of [...urlsDePlataforma(env), ...(env.ALLOWED_ORIGINS || "").split(",")]) {
    const host = hostDe(value || "")
    if (host) hosts.add(host)
  }
  return [...hosts]
}
