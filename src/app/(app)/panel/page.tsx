import { ParaTi } from "@/components/para-ti"
import { catalogoPara } from "@/server/catalogo-nav"
import { resumen } from "@/server/requests"
import { requireActor } from "@/server/session"

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const opciones = await catalogoPara(actor)
  const data = await resumen(actor)
  return (
    <ParaTi
      actorId={actor.id}
      tabInicial={params.tab}
      espacios={opciones.empresas.map((item) => ({ id: item.id, name: item.name }))}
      items={data.items.slice(0, 40).map((item) => ({
        code: item.code,
        title: item.title,
        tipo: item.type.name,
        espacio: item.empresa?.name ?? item.area.name,
        espacioId: item.empresaId,
        asignado: item.assignee?.name ?? null,
        marca: item.brand,
        actualizado: item.updatedAt.toISOString(),
        assigneeId: item.assigneeId,
      }))}
    />
  )
}
