import { Suspense } from "react"
import { Filtros } from "@/components/filtros"
import { Paginacion, TablaRequerimientos } from "@/components/tabla"
import { STATUS_LABEL } from "@/lib/domain"
import { consultaDesde, queryString } from "@/lib/list-query"
import { requireActor } from "@/server/session"
import { listar } from "@/server/requests"
import { prisma } from "@/lib/prisma"

export default async function RequerimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const consulta = consultaDesde(params, actor)
  const data = await listar(actor, consulta)
  const [empresas, proyectos, tipos, solicitantes] = await Promise.all([
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.proyecto.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.requestType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
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
          Cualquier persona de la casa puede ver el estado y el historial público. Las notas internas quedan para el equipo y para gerencia.
        </p>
      </div>
      <Suspense>
        <Filtros
          ruta="/requerimientos"
          estados={estados}
          empresas={empresas.map((item) => ({ value: item.id, label: item.name }))}
          proyectos={proyectos.map((item) => ({ value: item.id, label: item.name }))}
          tipos={tipos.map((item) => ({ value: item.id, label: item.name }))}
          solicitantes={solicitantes.map((item) => ({ value: item.id, label: item.name }))}
        />
      </Suspense>
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
