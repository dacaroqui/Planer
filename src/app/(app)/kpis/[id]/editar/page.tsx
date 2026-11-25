import { notFound, redirect } from "next/navigation"
import { TEAMS, TEAM_LABEL, puedeAprobarMeta, puedeVerMatriz } from "@/lib/objetivos"
import { aprobarMetaAction, guardarKpiAction } from "@/server/objetivos-actions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export default async function EditarKpiPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const { id } = await params
  const kpi = await prisma.kpi.findUnique({ where: { id } })
  if (!kpi) notFound()
  const nivel = kpi.objetivoId ? "objetivo" : kpi.area ? "area" : "persona"
  const [objetivos, kpis] = await Promise.all([
    prisma.objetivo.findMany({ orderBy: { titulo: "asc" }, select: { id: true, titulo: true } }),
    prisma.kpi.findMany({ where: { id: { not: kpi.id } }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ])
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-4xl">Editar KPI</h1>
      <form action={guardarKpiAction} className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
        <input type="hidden" name="id" value={kpi.id} />
        <input type="hidden" name="nivel" value={nivel} />
        <input type="hidden" name="volver" value={nivel === "area" ? "/kpis/areas" : nivel === "objetivo" ? "/objetivos" : "/kpis/mios"} />
        <label className="grid gap-1">Nombre<input name="nombre" required minLength={2} defaultValue={kpi.nombre} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Descripción<textarea name="descripcion" rows={2} defaultValue={kpi.descripcion} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">Unidad<input name="unidad" defaultValue={kpi.unidad} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Fuente<input name="fuente" defaultValue={kpi.fuente} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Línea base<input name="lineaBase" inputMode="decimal" defaultValue={kpi.lineaBase?.toString() ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Meta<input name="meta" inputMode="decimal" defaultValue={kpi.meta?.toString() ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Actual<input name="actual" inputMode="decimal" defaultValue={kpi.actual?.toString() ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Frecuencia
            <select name="frecuencia" aria-label="Frecuencia" defaultValue={kpi.frecuencia} className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="SEMANAL">Semanal</option><option value="QUINCENAL">Quincenal</option><option value="MENSUAL">Mensual</option></select>
          </label>
        </div>
        {nivel === "persona" ? (
          <label className="grid gap-1">Tipo
            <select name="tipo" aria-label="Tipo" defaultValue={kpi.tipo} className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="PRINCIPAL">Principal</option><option value="APOYO">Apoyo</option></select>
          </label>
        ) : null}
        {nivel === "area" ? (
          <label className="grid gap-1">Área
            <select name="area" aria-label="Área" defaultValue={kpi.area ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3">{TEAMS.map((team) => <option key={team} value={team}>{TEAM_LABEL[team]}</option>)}</select>
          </label>
        ) : null}
        {nivel === "objetivo" ? (
          <label className="grid gap-1">Objetivo
            <select name="objetivoId" aria-label="Objetivo" defaultValue={kpi.objetivoId ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3">{objetivos.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select>
          </label>
        ) : null}
        {nivel === "persona" ? (
          <label className="grid gap-1">Apoya a
            <select name="apoyaId" aria-label="KPI que apoya" defaultValue={kpi.apoyaId ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="">Ninguno</option>{kpis.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </label>
        ) : null}
        <label className="flex items-center gap-2">Antes de cobrar<input name="bloqueado" value="1" type="checkbox" defaultChecked={kpi.bloqueado} /></label>
        <label className="grid gap-1">Motivo del bloqueo<input name="motivoBloqueo" defaultValue={kpi.motivoBloqueo} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <button className="h-10 rounded-lg bg-[#1658B0] text-white" type="submit">Guardar KPI</button>
      </form>
      {puedeAprobarMeta(actor) && kpi.estadoMeta === "PROPUESTA" ? (
        <form action={aprobarMetaAction} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
          <p className="text-sm text-[#3d4a63]">La meta está propuesta. Solo un administrador la aprueba, después de las tres mediciones de la línea base.</p>
          <input type="hidden" name="kpiId" value={kpi.id} />
          <button className="mt-3 h-10 rounded-lg bg-[#222B7C] px-3 text-sm text-white" type="submit">Aprobar meta</button>
        </form>
      ) : null}
    </div>
  )
}
