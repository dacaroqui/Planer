import { Suspense } from "react"
import { Filtros } from "@/components/filtros"
import { Paginacion, TablaRequerimientos } from "@/components/tabla"
import { STATUS_LABEL } from "@/lib/domain"
import { consultaDesde, queryString } from "@/lib/list-query"
import { requireActor } from "@/server/session"
import { listar } from "@/server/requests"

export default async function RequerimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const data = await listar(actor, consultaDesde(params, actor))
  const estados = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Requerimientos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cualquier persona de la casa puede ver el estado y el historial público. Las notas internas quedan para el equipo y para gerencia.
        </p>
      </div>
      <Suspense>
        <Filtros ruta="/requerimientos" estados={estados} />
      </Suspense>
      <TablaRequerimientos
        items={data.items}
        vacio="No hay requerimientos con esos filtros. Pruebe otra búsqueda o radique uno nuevo."
      />
      <Paginacion page={data.page} pages={data.pages} ruta="/requerimientos" query={queryString(params)} />
    </div>
  )
}
