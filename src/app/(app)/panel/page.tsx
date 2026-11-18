import { redirect } from "next/navigation"
import { ParaTi } from "@/components/para-ti"
import { catalogoPara } from "@/server/catalogo-nav"
import { resumen } from "@/server/requests"
import { tareasAsignadas } from "@/server/para-ti"
import { requireActor } from "@/server/session"

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const actor = await requireActor()
  if (actor.role === "SOLICITANTE") redirect("/mis-solicitudes")
  const params = await searchParams
  const opciones = await catalogoPara(actor)
  const [data, tareas] = await Promise.all([resumen(actor), tareasAsignadas(actor.id)])
  const pedidos = data.items.slice(0, 40).map((item) => ({
    code: item.code,
    title: item.title,
    tipo: item.type.name,
    espacio: item.empresa?.name ?? item.area.name,
    espacioId: item.empresaId,
    asignado: item.assignee?.name ?? null,
    marca: item.brand,
    actualizado: item.updatedAt.toISOString(),
    assigneeId: item.assigneeId,
    href: `/requerimientos/${item.code}`,
    pedido: null as string | null,
  }))
  const piezas = tareas.map((tarea) => ({
    code: tarea.code,
    title: tarea.title,
    tipo: "Tarea",
    espacio: tarea.espacio,
    espacioId: "",
    asignado: tarea.asignado,
    marca: tarea.marca,
    actualizado: tarea.actualizado,
    assigneeId: tarea.assigneeId,
    href: tarea.href,
    pedido: tarea.href.startsWith("/requerimientos/") ? tarea.code : null,
  }))
  return (
    <ParaTi
      actorId={actor.id}
      tabInicial={params.tab}
      puedeBandeja={actor.isAdmin || actor.memberships.some((item) => item.role === "AGENTE" || item.role === "LIDER")}
      ahoraIso={new Date().toISOString()}
      espacios={opciones.empresas.map((item) => ({ id: item.id, name: item.name }))}
      items={[...pedidos, ...piezas.filter((tarea) => !pedidos.some((pedido) => pedido.code === tarea.code && pedido.tipo === "Tarea"))]}
    />
  )
}
