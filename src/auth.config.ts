import type { NextAuthConfig } from "next-auth"
import { middlewarePermite } from "@/lib/rutas-publicas"

const enHttps = (process.env.AUTH_URL || process.env.APP_URL || "").startsWith("https://") || process.env.VERCEL === "1"
const opcionesCookie = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: enHttps }

export const authConfig = {
  trustHost: process.env.AUTH_TRUST_HOST !== "false",
  useSecureCookies: enHttps,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  // Auth.js a veces ignora useSecureCookies en el callback y escribe authjs.session-token
  // sin el prefijo, mientras el middleware busca __Secure-authjs.session-token.
  cookies: {
    sessionToken: {
      name: enHttps ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: opcionesCookie,
    },
    callbackUrl: {
      name: enHttps ? "__Secure-authjs.callback-url" : "authjs.callback-url",
      options: opcionesCookie,
    },
    csrfToken: {
      name: enHttps ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: opcionesCookie,
    },
  },
  callbacks: {
    authorized({ auth, request }) {
      return middlewarePermite(request.nextUrl.pathname, Boolean(auth?.user))
    },
  },
} satisfies NextAuthConfig
