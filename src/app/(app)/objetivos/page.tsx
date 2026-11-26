import Link from "next/link"
import { TargetIcon } from "lucide-react"
import { redirect } from "next/navigation"
import { ArbolObjetivos } from "@/components/objetivos-arbol"
import { MARCAS, MARCA_LABEL, TEAM_LABEL, TEAMS, puedeEditarArea, puedeVerMatriz } from "@/lib/objetivos"
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
      {arbol.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay objetivos para este filtro.</p> : (
        <ArbolObjetivos
          puedeMeta={esAdmin(actor)}
          personas={personas}
          fases={fases.map((fase) => ({ id: fase.id, team: fase.team, nombre: fase.nombre }))}
          proyectos={proyectos}
          objetivos={arbol.map((objetivo) => ({
            id: objetivo.id,
            marca: objetivo.marca,
            titulo: objetivo.titulo,
            area: objetivo.area,
            dueno: objetivo.dueno.name,
            duenoId: objetivo.dueno.id,
            periodoInicio: objetivo.periodoInicio.toISOString().slice(0, 10),
            periodoFin: objetivo.periodoFin.toISOString().slice(0, 10),
            estado: objetivo.estado,
            horas: objetivo.horas,
            costo: objetivo.costo,
            costoTope: objetivo.costoTope,
            excede: objetivo.excede,
            puedeEditar: puedeEditarArea(actor, objetivo.area),
            kpis: objetivo.kpis.map((kpi) => ({ id: kpi.id, nombre: kpi.nombre, actual: kpi.actual, meta: kpi.meta, unidad: kpi.unidad, estado: kpi.estadoMeta, actividades: kpi._count.tareas, bloqueado: kpi.bloqueado, motivo: kpi.motivoBloqueo })),
            proyectos: objetivo.proyectos.map((proyecto) => ({
              id: proyecto.id,
              name: proyecto.name,
              fase: proyecto.fase,
              medio: proyecto.medio,
              horas: proyecto.horas,
              costo: proyecto.costoRollup,
              actividades: proyecto.actividades.map((actividad) => ({ id: actividad.id, titulo: actividad.titulo, responsable: actividad.responsable, horas: actividad.horas })),
            })),
          }))}
        />
      )}
    </div>
  )
}
