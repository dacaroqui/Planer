export function ajustarRedireccion(requestHost: string, proto: string, location: string) {
  let destino: URL
  try {
    destino = new URL(location)
  } catch {
    return location
  }
  const host = requestHost.split(",")[0]?.trim()
  if (!host || destino.host === host) return location
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1")
  const protocolo = proto === "https" ? "https:" : "http:"
  if (!local && protocolo === "https:") return location
  destino.host = host
  destino.protocol = local ? "http:" : protocolo
  return destino.toString()
}

export function urlDeLogin(hostHeader: string, protoHeader: string, path: string) {
  const host = hostHeader.split(",")[0]?.trim()
  if (!host) return "/login"
  const proto = protoHeader.split(",")[0]?.trim() === "https" ? "https" : "http"
  const destino = new URL("/login", `${proto}://${host}`)
  if (path && path !== "/login") destino.searchParams.set("callbackUrl", path)
  return destino.toString()
}

export function cookieSegura(proto: string) {
  return proto.split(",")[0]?.trim() === "https"
}
