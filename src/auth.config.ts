import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname
      if (
        path === "/login" ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/salud") ||
        path.startsWith("/api/cron")
      ) return true
      return Boolean(auth?.user)
    },
  },
} satisfies NextAuthConfig
