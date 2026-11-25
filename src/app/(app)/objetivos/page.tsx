import Link from "next/link"
import { TargetIcon } from "lucide-react"
import { redirect } from "next/navigation"
import { SelloBloqueo, TextoKpi, claseTope } from "@/components/objetivos-ui"
import { MARCAS, MARCA_LABEL, OBJETIVO_LABEL, TEAM_LABEL, TEAMS, puedeVerMatriz } from "@/lib/objetivos"
import { asignarProyectoAction } from "@/server/objetivos-actions"
import { listarFases, listarObjetivos } from "@/server/objetivos"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import { esAdmin } from "@/lib/permissions"

export default async function ObjetivosPage({ searchParams }: { searchParams: Promise<{ marca?: string; area?: string; dueno?: string; desde?: string; hasta?: string; fase?: string }> }) {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const filtros = await searchParams
  const [arbol, fases, personas, proyectos] = await Promise.all([
    listarObjetivos(actor, filtros),
    listarFases(),
    prisma.user.findMany({ where: { active: true, deactivatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.proyecto.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, team: true } }),
  ])
  const porMarca = new Map<string, typeof arbol>()
  for (const objetivo of arbol) {
    const lista = porMarca.get(objetivo.marca) ?? []
    lista.push(objetivo)
    porMarca.set(objetivo.marca, lista)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[#E7F0FB] text-[#1658B0]"><TargetIcon className="size-5" /></span>
          <div>
            <h1 className="font-heading text-4xl text-[#15122A]">Objetivos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Marca, objetivo, KPIs, entregable y actividades.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/objetivos/nuevo" className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Nuevo objetivo</Link>
          <a href="/api/objetivos/exportar" className="inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm font-medium text-[#1658B0]">Exportar .xlsx</a>
        </div>
      </div>
      <form className="flex flex-wrap gap-2" action="/objetivos">
        <select name="marca" defaultValue={filtros.marca ?? ""} aria-label="Marca" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"><option value="">Marca</option>{MARCAS.map((marca) => <option key={marca} value={marca}>{MARCA_LABEL[marca]}</option>)}</select>
        <select name="area" defaultValue={filtros.area ?? ""} aria-label="Área" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"><option value="">Área</option>{TEAMS.map((team) => <option key={team} value={team}>{TEAM_LABEL[team]}</option>)}</select>
        <select name="dueno" defaultValue={filtros.dueno ?? ""} aria-label="Dueño" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"><option value="">Dueño</option>{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select>
        <input name="desde" type="date" lang="es-CO" defaultValue={filtros.desde ?? ""} aria-label="Desde" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm" />
        <input name="hasta" type="date" lang="es-CO" defaultValue={filtros.hasta ?? ""} aria-label="Hasta" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm" />
        <select name="fase" defaultValue={filtros.fase ?? ""} aria-label="Fase" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm"><option value="">Fase</option>{[...new Set(fases.map((fase) => fase.nombre))].map((fase) => <option key={fase} value={fase}>{fase}</option>)}</select>
        <button className="h-10 rounded-lg bg-[#1658B0] px-3 text-sm text-white" type="submit">Filtrar</button>
      </form>
      {arbol.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay objetivos para este filtro.</p> : [...porMarca.entries()].map(([marca, lista]) => (
        <section key={marca} className="rounded-xl border border-[#E4E7EC] bg-white">
          <h2 className="border-b border-[#E4E7EC] px-4 py-3 font-heading text-2xl">{MARCA_LABEL[marca as "CIFES"] || marca}</h2>
          {lista.map((objetivo) => (
            <details key={objetivo.id} open className="border-b border-[#F0F2F5] px-4 py-3">
              <summary className="cursor-pointer font-medium">
                {objetivo.titulo}
                <span className="ml-2 text-sm text-muted-foreground">{TEAM_LABEL[objetivo.area]} · {objetivo.dueno.name} · {OBJETIVO_LABEL[objetivo.estado]} · {objetivo.horas} h</span>
                <span className={`ml-2 text-sm ${claseTope(objetivo.excede)}`}>Costo {objetivo.costo}{objetivo.costoTope != null ? ` / tope ${objetivo.costoTope}` : ""}{objetivo.excede ? " · por encima del tope" : ""}</span>
              </summary>
              <p className="mt-3"><Link href={`/objetivos/${objetivo.id}/editar`} className="text-sm text-[#1658B0]">Editar objetivo</Link></p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {objetivo.kpis.map((kpi) => (
                  <div key={kpi.id} className="rounded-lg border border-[#E4E7EC] p-3">
                    <TextoKpi nombre={kpi.nombre} actual={kpi.actual} meta={kpi.meta} unidad={kpi.unidad} />
                    <SelloBloqueo bloqueado={kpi.bloqueado} motivo={kpi.motivoBloqueo} />
                  </div>
                ))}
              </div>
              <ul className="mt-3 grid gap-2">
                {objetivo.proyectos.map((proyecto) => (
                  <li key={proyecto.id} className="rounded-lg bg-[#F8FAFD] px-3 py-2 text-sm">
                    <Link href={`/proyectos/${proyecto.id}`} className="font-medium text-[#1658B0]">{proyecto.name}</Link>
                    <span className="text-muted-foreground"> · {proyecto.fase || "Sin fase"} · {proyecto.medio || "Sin medio"} · {proyecto.horas} h · {proyecto.costoRollup}</span>
                    <ul className="mt-1 text-xs text-[#3d4a63]">
                      {proyecto.actividades.map((actividad) => <li key={actividad.id}>{actividad.titulo} · {actividad.responsable} · {actividad.horas} h</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
              {esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER" && item.team === objetivo.area) ? (
                <form action={asignarProyectoAction} className="mt-3 flex flex-wrap gap-2 text-sm">
                  <input type="hidden" name="objetivoId" value={objetivo.id} />
                  <select name="proyectoId" aria-label="Proyecto a asignar" className="h-10 rounded-lg border border-[#E4E7EC] px-2">
                    {proyectos.filter((item) => item.team === objetivo.area).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <select name="fase" aria-label="Fase del proyecto" className="h-10 rounded-lg border border-[#E4E7EC] px-2">
                    <option value="">Fase</option>
                    {fases.filter((fase) => fase.team === objetivo.area).map((fase) => <option key={fase.id} value={fase.nombre}>{fase.nombre}</option>)}
                  </select>
                  <input name="medio" aria-label="Medio" placeholder="Medio" className="h-10 rounded-lg border border-[#E4E7EC] px-2" />
                  <input name="costo" aria-label="Costo del proyecto" placeholder="Costo" className="h-10 w-24 rounded-lg border border-[#E4E7EC] px-2" />
                  <button className="h-10 rounded-lg bg-[#1658B0] px-3 text-white" type="submit">Asignar</button>
                </form>
              ) : null}
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}
