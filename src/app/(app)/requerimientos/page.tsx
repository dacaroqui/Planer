import { Suspense } from "react"
import { AccionesMasivas } from "@/components/acciones-masivas"
import { Filtros } from "@/components/filtros"
import { Paginacion, TablaRequerimientos } from "@/components/tabla"
import { STATUS_LABEL } from "@/lib/domain"
import { consultaDesde, queryString } from "@/lib/list-query"
import { esAdmin } from "@/lib/permissions"
import { requireActor } from "@/server/session"
import { listar, opcionesVisibles } from "@/server/requests"

export default async function RequerimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const consulta = consultaDesde(params, actor)
  const data = await listar(actor, consulta)
  const opciones = await opcionesVisibles(actor)
  const estados = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))
  const uno = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Requerimientos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aquí ve los requerimientos que su rol le permite consultar. Las notas internas quedan para el equipo del área.
        </p>
      </div>
      <Suspense>
        <Filtros
          ruta="/requerimientos"
          estados={estados}
          empresas={opciones.empresas.map((item) => ({ value: item.id, label: item.name }))}
          proyectos={opciones.proyectos.map((item) => ({ value: item.id, label: item.name }))}
          tipos={opciones.tipos.map((item) => ({ value: item.id, label: item.name }))}
          solicitantes={opciones.personas.map((item) => ({ value: item.id, label: item.name }))}
        />
      </Suspense>
      {esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER") ? <AccionesMasivas codes={data.items.map((item) => item.code)} /> : null}
      <TablaRequerimientos
        items={data.items}
        vacio="No hay requerimientos con esos filtros. Pruebe otra búsqueda o radique uno nuevo."
        ruta="/requerimientos"
        consulta={queryString(params)}
        sort={uno("sort")}
        dir={uno("dir")}
      />
      <Paginacion page={data.page} pages={data.pages} ruta="/requerimientos" query={queryString(params)} />
    </div>
  )
}
