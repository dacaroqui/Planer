import { ListaMisSolicitudes } from "@/app/(app)/mis-solicitudes/lista"
import { requireActor } from "@/server/session"
import { listar } from "@/server/requests"

export default async function MisSolicitudesPage() {
  const actor = await requireActor()
  const data = await listar(actor, { mine: true, pageSize: 100, sort: "updatedAt" })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Mis solicitudes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solo los requerimientos que usted radicó, con su estado y responsable.</p>
      </div>
      <ListaMisSolicitudes items={data.items.map((item) => ({
        code: item.code,
        title: item.title,
        team: item.team,
        status: item.status,
        assignee: item.assignee?.name ?? "Sin responsable",
        updatedAt: item.updatedAt.toISOString(),
      }))} />
    </div>
  )
}
