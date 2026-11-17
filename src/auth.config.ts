import type { NextAuthConfig } from "next-auth"

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
      const path = request.nextUrl.pathname
      if (
        path === "/login" ||
        path === "/registro" ||
        path.startsWith("/invitar/") ||
        path.startsWith("/restablecer/") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/salud") ||
        path.startsWith("/api/cron")
      ) return true
      return Boolean(auth?.user)
    },
  },
} satisfies NextAuthConfig
