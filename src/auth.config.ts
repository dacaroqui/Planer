import type { NextAuthConfig } from "next-auth"

const secure = (process.env.AUTH_URL || process.env.APP_URL || "").startsWith("https://")

export const authConfig = {
  trustHost: true,
  useSecureCookies: secure,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  cookies: {
    sessionToken: {
      name: secure ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
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
