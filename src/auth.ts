import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import type { Provider } from "next-auth/providers"
import { authConfig } from "@/auth.config"
import { evaluarIngreso } from "@/lib/access"
import { prisma } from "@/lib/prisma"
import { isInternalEmail } from "@/lib/time"

export function modoAuth() {
  const id = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID)
  const secret = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET)
  const tenant = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID)
  return {
    dev: process.env.DEV_AUTH_ENABLED === "true",
    entra: id && secret && tenant,
    entraIncompleto: (id || secret || tenant) && !(id && secret && tenant),
  }
}

function correoDe(user?: { email?: string | null }, profile?: unknown) {
  const record = profile && typeof profile === "object" ? profile as Record<string, unknown> : {}
  const raw = user?.email || record.email || record.preferred_username || ""
  return String(raw).trim().toLowerCase()
}

async function areaInicial() {
  const preferred = await prisma.area.findFirst({ where: { name: "Académico", active: true } })
  if (preferred) return preferred
  return prisma.area.findFirst({ where: { active: true }, orderBy: { name: "asc" } })
}

const providers: Provider[] = []
const modo = modoAuth()

if (modo.entra) {
  providers.push(MicrosoftEntraID({
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
  }))
}

if (modo.dev) {
  providers.push(Credentials({
    id: "dev",
    name: "Desarrollo",
    credentials: { email: { label: "Correo", type: "email" } },
    authorize: async (credentials) => {
      if (process.env.DEV_AUTH_ENABLED !== "true") return null
      const email = String(credentials?.email || "").trim().toLowerCase()
      const user = await prisma.user.findUnique({ where: { email } })
      const decision = evaluarIngreso(email, user, { aprovisionar: false })
      if (!decision.ok || !user) return null
      return { id: user.id, email: user.email, name: user.name }
    },
  }))
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      const email = correoDe(user, profile)
      if (!isInternalEmail(email)) return false
      const existing = await prisma.user.findUnique({ where: { email } })
      const entra = account?.provider === "microsoft-entra-id"
      const decision = evaluarIngreso(email, existing, { aprovisionar: entra })
      if (!decision.ok) return false
      if (entra && !existing) {
        const area = await areaInicial()
        if (!area) return false
        await prisma.user.create({
          data: {
            email,
            name: user.name?.trim() || email,
            role: "SOLICITANTE",
            areaId: area.id,
          },
        })
      }
      return true
    },
    async jwt({ token, user, profile }) {
      const email = correoDe(user ?? undefined, profile) || token.email
      if (email) token.email = email.toString().toLowerCase()
      return token
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = String(token.email)
      return session
    },
  },
})
