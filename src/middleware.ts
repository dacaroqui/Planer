import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"
import { urlDeLogin } from "@/lib/auth-host"
import { middlewarePermite } from "@/lib/rutas-publicas"

const { auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    authorized() {
      return true
    },
  },
})

export default auth((req) => {
  const path = req.nextUrl.pathname
  if (middlewarePermite(path, Boolean(req.auth?.user))) return NextResponse.next()
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "")
  return NextResponse.redirect(urlDeLogin(host, proto, `${path}${req.nextUrl.search}`))
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp)$).*)"],
}
