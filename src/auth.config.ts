import type { NextAuthConfig } from "next-auth"
import { middlewarePermite } from "@/lib/rutas-publicas"

export const authConfig = {
  trustHost: true,
  useSecureCookies: false,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: false,
      },
    },
  },
  callbacks: {
    authorized({ auth, request }) {
      return middlewarePermite(request.nextUrl.pathname, Boolean(auth?.user))
    },
  },
} satisfies NextAuthConfig
