import Link from "next/link"
import { Suspense } from "react"
import { AlertTriangleIcon, ClipboardListIcon, ClockIcon } from "lucide-react"
import { Barra } from "@/components/barra"
import { EstadoBadge, SlaBadge } from "@/components/insignias"
import { ControlesPanel } from "@/components/panel-controles"
import { esAdmin, rolEn } from "@/lib/permissions"
import { statusLabel } from "@/lib/domain"
import { DateTime } from "luxon"
import { ZONE } from "@/lib/time"
import { requireActor } from "@/server/session"
import { dashboard, listar } from "@/server/requests"
import { listarProyectos } from "@/server/proyectos"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const puede = esAdmin(actor) || actor.memberships.length > 0
  if (!puede) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-2xl">Panel de gestión</h1>
        <p className="mt-3 text-sm text-muted-foreground">El panel es para los equipos. Como solicitante, el seguimiento está en Mis solicitudes.</p>
      </div>
    )
  }
  const periodo = one("periodo") || "8s"
  const ahora = DateTime.now().setZone(ZONE)
  const desde = one("from") || (periodo === "mes" ? ahora.startOf("month") : periodo === "anio" ? ahora.startOf("year") : ahora.minus({ weeks: 8 })).toISO() || undefined
  const team = one("team")
  const empresaId = one("empresa")
  const projectId = one("proyecto")
  const areaId = one("area")
  const data = await dashboard(actor, { team, brand: one("brand"), empresaId, projectId, areaId, from: desde, to: one("to") })
  const mias = await listar(actor, { assignedToMe: true, openOnly: true, pageSize: 6, areaId: areaId || undefined })
  const [empresas, proyectosCatalogo, areasCatalogo, avanceProyectos] = await Promise.all([
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.proyecto.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, empresaId: true } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listarProyectos(actor, empresaId),
  ])
  const avances = projectId ? avanceProyectos.filter((item) => item.id === projectId) : avanceProyectos
  const soloLectura = !esAdmin(actor) && actor.memberships.every((item) => item.role === "OBSERVADOR") && !actor.memberships.some((item) => rolEn(actor, item.team) !== "OBSERVADOR")
  const mitad = Math.ceil(data.porEstado.length / 2)
  const columnas = [data.porEstado.slice(0, mitad), data.porEstado.slice(mitad)]
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl">Panel de gestión</h1>
        <p className="mt-1 text-sm text-muted-foreground">Carga de trabajo, cumplimiento y avance de proyectos.{soloLectura ? " Está en modo solo lectura." : ""}</p>
      </div>
      <Suspense>
        <ControlesPanel empresas={empresas} areas={areasCatalogo} proyectos={proyectosCatalogo} />
      </Suspense>
      <div className="grid gap-3 lg:grid-cols-3">
        <Tarjeta icono={<ClipboardListIcon className="size-5 text-[#1658B0]" />} fondo="#E7F0FB" etiqueta="Requerimientos abiertos" valor={String(data.abiertos)} href={`/requerimientos?${new URLSearchParams({ ...(team ? { team } : {}), ...(areaId ? { area: areaId } : {}) }).toString()}`} />
        <Tarjeta icono={<ClockIcon className="size-5 text-[#B45309]" />} fondo="#FEF3C7" etiqueta="Cumplimiento de SLA" valor={data.cumplimiento === null ? "—" : `${data.cumplimiento} %`} />
        <Tarjeta icono={<AlertTriangleIcon className="size-5 text-[#B91C1C]" />} fondo="#FEE2E2" etiqueta="Requerimientos vencidos" valor={String(data.vencidos.length)} href="/requerimientos?sla=vencido" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-lg border border-[#E2E8F0] bg-white">
          <header className="flex items-center justify-between gap-3 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              Requieren atención
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{data.vencidos.length} vencidos</span>
            </h2>
            <Link href="/requerimientos?sla=vencido" className="text-sm text-[#1658B0] hover:underline">Ver todos →</Link>
          </header>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-t border-[#F0F4FA]"><th className="px-4 py-2 font-medium">Requerimiento</th><th className="px-3 py-2 font-medium">Estado</th><th className="px-4 py-2 font-medium">SLA</th></tr>
            </thead>
            <tbody>
              {data.vencidos.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-sm text-muted-foreground">Ningún SLA de solución está vencido.</td></tr>
              ) : data.vencidos.slice(0, 6).map((item) => (
                <tr key={item.id} className="border-t border-[#F0F4FA]">
                  <td className="px-4 py-2.5"><Link href={`/requerimientos/${item.code}`} className="hover:underline">{item.code} · {item.title}</Link></td>
                  <td className="px-3 py-2.5"><EstadoBadge status={item.status} etiqueta={item.status === "APROBADO" ? "En cola" : undefined} /></td>
                  <td className="px-4 py-2.5"><SlaBadge state={item.sla.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-sm font-medium">Avance por proyecto</h2>
          <ul className="mt-3 space-y-3">
            {avances.length === 0 ? <li className="text-sm text-muted-foreground">No hay proyectos en este corte.</li> : avances.slice(0, 6).map((proyecto) => (
              <li key={proyecto.id}>
                <Link href={`/proyectos/${proyecto.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                  <span>
                    <span className="block font-medium">{proyecto.name}</span>
                    <span className="text-xs text-muted-foreground">{proyecto.empresa.name}</span>
                  </span>
                  <span className="flex w-36 items-center gap-2">
                    <Barra porcentaje={proyecto.avance.porcentaje} />
                    <span className="w-10 text-right text-xs tabular-nums">{proyecto.avance.porcentaje}%</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-sm font-medium">Abiertos por estado</h2>
          {data.porEstado.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No hay abiertos con ese filtro.</p> : (
            <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {columnas.map((columna, indice) => (
                <ul key={indice} className="divide-y divide-[#F0F4FA]">
                  {columna.map((item) => (
                    <li key={item.status}>
                      <Link className="flex items-center justify-between py-2 text-sm hover:underline" href={`/requerimientos?status=${item.status}${team ? `&team=${team}` : ""}${areaId ? `&area=${areaId}` : ""}`}>
                        <span>{item.status === "APROBADO" ? "En cola" : statusLabel(item.status)}</span>
                        <span className="tabular-nums text-muted-foreground">{item.total}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-sm font-medium">Mis asignaciones</h2>
          {mias.items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#E7F0FB] text-[#1658B0]">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>
              </span>
              <p className="mt-3 text-sm font-medium">No tienes requerimientos asignados</p>
              <p className="mt-1 text-xs text-muted-foreground">Tus próximas asignaciones aparecerán aquí.</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[#F0F4FA]">
              {mias.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/requerimientos/${item.code}`} className="truncate hover:underline">{item.code} · {item.title}</Link>
                  <EstadoBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Tarjeta({ icono, fondo, etiqueta, valor, href }: { icono: React.ReactNode; fondo: string; etiqueta: string; valor: string; href?: string }) {
  const cuerpo = (
    <article className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
      <span className="inline-flex size-11 items-center justify-center rounded-lg" style={{ background: fondo }}>{icono}</span>
      <span>
        <span className="block text-sm text-muted-foreground">{etiqueta}</span>
        <span className="block font-heading text-3xl leading-tight">{valor}</span>
      </span>
    </article>
  )
  return href ? <Link href={href}>{cuerpo}</Link> : cuerpo
}
