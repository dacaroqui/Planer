import { Suspense } from "react"
import { ConsultaRequerimientos } from "@/components/consulta-requerimientos"
import { Esqueleto } from "@/components/esqueleto"
import { esAdmin, puedeAdministrar } from "@/lib/permissions"
import { consultaDesde } from "@/lib/list-query"
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
    <Suspense fallback={<Esqueleto />}>
      <ListaCargada searchParams={searchParams} />
    </Suspense>
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
  const tamanos = [7, 10, 25, 50]
  const pageSize = tamanos.includes(consulta.pageSize ?? 0) ? consulta.pageSize : 7
  const data = await listar(actor, { ...consulta, pageSize, porActualizacion: true, conPausas: true, conTareas: false })
  const opciones = await catalogoPara(actor)
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
    <ConsultaRequerimientos
      items={data.items.map((item) => ({
        code: item.code,
        title: item.title,
        status: item.status,
        priority: item.priority,
        typeName: item.type.name,
        requester: item.requester.name,
        updatedAt: item.updatedAt.toISOString(),
        sla: item.sla.state,
      }))}
      total={data.total}
      page={data.page}
      pages={data.pages}
      empresas={opciones.empresas.map((item) => ({ value: item.id, label: item.name }))}
      proyectos={opciones.proyectos.map((item) => ({ value: item.id, label: item.name }))}
      tipos={opciones.tipos.map((item) => ({ value: item.id, label: item.name }))}
      areas={opciones.areas.map((item) => ({ value: item.id, label: item.name }))}
      solicitantes={opciones.personas.map((item) => ({ value: item.id, label: item.name }))}
      puedePrioridad={puedePrioridad}
      puedeEstado={puedeEstado}
      puedeAsignar={puedeAsignar}
      puedeEliminar={puedeAdministrar(actor)}
      agentes={agentes}
    />
  )
}
