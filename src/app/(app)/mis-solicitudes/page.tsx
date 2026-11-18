import Link from "next/link"
import { ListaMisSolicitudes } from "@/app/(app)/mis-solicitudes/lista"
import { TERMINAL_STATUSES } from "@/lib/domain"
import { puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { armarEtapas, pasoEsperado } from "@/lib/seguimiento"
import { evaluarSla } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function MisSolicitudesPage() {
  const actor = await requireActor()
  const filas = await prisma.request.findMany({
    where: { requesterId: actor.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      assignee: { select: { name: true } },
      pauses: { select: { startedAt: true, endedAt: true } },
      activities: {
        where: { kind: "STATUS", field: "estado", internal: false },
        orderBy: { createdAt: "asc" },
        select: { toValue: true, createdAt: true },
      },
    },
  })
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl">Mis solicitudes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Aquí ve en qué etapa va cada solicitud que usted radicó, quién la tiene y qué se espera ahora.</p>
        </div>
        {puedeRadicar(actor) ? (
          <Link href="/mis-solicitudes/radicar" className="inline-flex h-9 items-center rounded-md bg-[#1658B0] px-3 text-sm font-medium text-white hover:bg-[#222B7C]">
            Radicar solicitud
          </Link>
        ) : null}
      </div>
      <ListaMisSolicitudes items={filas.map((item) => {
        const sla = evaluarSla(item)
        return {
          code: item.code,
          title: item.title,
          status: item.status,
          assignee: item.assignee?.name ?? "Sin responsable todavía",
          sla: sla.state,
          vence: sla.dueAt ? sla.dueAt.toISOString() : null,
          paso: pasoEsperado(item.status),
          etapas: armarEtapas({
            status: item.status,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            cambios: item.activities,
          }),
          cerrado: TERMINAL_STATUSES.has(item.status),
          hecho: item.resolutionNote,
        }
      })} />
    </div>
  )
}
