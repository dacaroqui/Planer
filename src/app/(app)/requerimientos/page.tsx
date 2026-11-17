import { Suspense } from "react"
import { Esqueleto } from "@/components/esqueleto"
import { Filtros } from "@/components/filtros"
import { ListaRequerimientos } from "@/components/lista-requerimientos"
import { Paginacion } from "@/components/tabla"
import { STATUS_LABEL } from "@/lib/domain"
import { consultaDesde, queryString } from "@/lib/list-query"
import { esAdmin, puedeAdministrar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { catalogoPara } from "@/server/catalogo-nav"
import { listar } from "@/server/requests"
import { requireActor } from "@/server/session"

export default function RequerimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lista</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aquí ve los requerimientos que su rol le permite consultar. Las notas internas quedan para el equipo del área.
        </p>
      </div>
      <Suspense fallback={<Esqueleto />}>
        <ListaCargada searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function ListaCargada({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const consulta = consultaDesde(params, actor)
  const data = await listar(actor, { ...consulta, conPausas: true, conTareas: false })
  const opciones = await catalogoPara(actor)
  const estados = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))
  const uno = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const puedePrioridad = esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER")
  const puedeEstado = esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER" || item.role === "AGENTE")
  const puedeAsignar = esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER")
  const agentes = puedeAsignar
    ? await prisma.user.findMany({
        where: { active: true, areaRoles: { some: { role: { in: ["AGENTE", "LIDER"] } } } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : []
  return (
    <>
      <Filtros
        ruta="/requerimientos"
        estados={estados}
        empresas={opciones.empresas.map((item) => ({ value: item.id, label: item.name }))}
        proyectos={opciones.proyectos.map((item) => ({ value: item.id, label: item.name }))}
        tipos={opciones.tipos.map((item) => ({ value: item.id, label: item.name }))}
        areas={opciones.areas.map((item) => ({ value: item.id, label: item.name }))}
        solicitantes={opciones.personas.map((item) => ({ value: item.id, label: item.name }))}
      />
      <ListaRequerimientos
        items={data.items}
        vacio="No hay requerimientos con esos filtros. Pruebe otra búsqueda o radique uno nuevo."
        ruta="/requerimientos"
        consulta={queryString(params)}
        sort={uno("sort")}
        dir={uno("dir")}
        puedePrioridad={puedePrioridad}
        puedeEstado={puedeEstado}
        puedeAsignar={puedeAsignar}
        puedeEliminar={puedeAdministrar(actor)}
        estados={estados}
        agentes={agentes}
      />
      <Paginacion page={data.page} pages={data.pages} ruta="/requerimientos" query={queryString(params)} />
    </>
  )
}
