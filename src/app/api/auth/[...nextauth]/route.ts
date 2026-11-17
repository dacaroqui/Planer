import type { NextRequest } from "next/server"
import { handlers } from "@/auth"
import { ajustarRedireccion, cookieSegura } from "@/lib/auth-host"

async function responder(request: NextRequest, metodo: "GET" | "POST") {
  const origen = metodo === "GET" ? handlers.GET : handlers.POST
  const respuesta = await origen(request)
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
  const headers = new Headers(respuesta.headers)
  const location = headers.get("location")
  if (location) headers.set("location", ajustarRedireccion(host, proto, location))
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : []
  if (cookies.length > 0) {
    headers.delete("set-cookie")
    for (const cookie of cookies) {
      const sinSecure = cookie.replace(/;\s*Secure/gi, "").replace(/__Secure-/g, "").replace(/__Host-/g, "")
      headers.append("set-cookie", cookieSegura(proto) ? `${sinSecure}; Secure` : sinSecure)
    }
  }
  return new Response(respuesta.body, { status: respuesta.status, headers })
}

export function GET(request: NextRequest) {
  return responder(request, "GET")
}

export function POST(request: NextRequest) {
  return responder(request, "POST")
}
