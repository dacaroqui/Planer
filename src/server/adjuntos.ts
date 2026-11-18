import { prisma } from "@/lib/prisma"
import { toActor } from "@/lib/actor"
import { puedeVer, puedeVerNotaInterna } from "@/lib/permissions"
import { adjuntoVisible } from "@/lib/cronologia"

export type AccesoAdjunto =
  | { status: 401 }
  | { status: 403 }
  | { status: 404 }
  | { status: 200; filename: string; mimeType: string; storedName: string }

export async function resolverAdjunto(email: string | null, id: string): Promise<AccesoAdjunto> {
  if (!email) return { status: 401 }
  const user = await prisma.user.findUnique({ where: { email }, include: { areaRoles: true } })
  if (!user?.active) return { status: 403 }
  const file = await prisma.attachment.findUnique({
    where: { id },
    include: {
      request: { select: { team: true, requesterId: true } },
      comment: { select: { kind: true } },
    },
  })
  const actor = toActor(user)
  if (!file || !puedeVer(actor, file.request)) return { status: 404 }
  if (!adjuntoVisible(puedeVerNotaInterna(actor, file.request.team), file.comment?.kind ?? null)) return { status: 404 }
  return { status: 200, filename: file.filename, mimeType: file.mimeType, storedName: file.storedName }
}
