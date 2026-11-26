import { redirect } from "next/navigation"
import { TEAMS, TEAM_LABEL, puedeVerMatriz } from "@/lib/objetivos"
import { esAdmin } from "@/lib/permissions"
import { guardarKpiAction } from "@/server/objetivos-actions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export default async function NuevoKpiPage({ searchParams }: { searchParams: Promise<{ nivel?: string; volver?: string; persona?: string }> }) {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const params = await searchParams
  const nivel = params.nivel === "objetivo" || params.nivel === "area" ? params.nivel : "persona"
  const puedeAsignar = esAdmin(actor) || actor.memberships.some((item) => item.role === "LIDER")
  const [objetivos, kpis, personas] = await Promise.all([
    prisma.objetivo.findMany({ orderBy: { titulo: "asc" }, select: { id: true, titulo: true } }),
    prisma.kpi.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    puedeAsignar && nivel === "persona"
      ? prisma.user.findMany({ where: { active: true, deactivatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ])
  const personaInicial = personas.some((persona) => persona.id === params.persona) ? params.persona : actor.id
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-4xl">Nuevo KPI</h1>
      <form action={guardarKpiAction} className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
        <input type="hidden" name="nivel" value={nivel} />
        <input type="hidden" name="volver" value={params.volver || (nivel === "area" ? "/kpis/areas" : nivel === "objetivo" ? "/objetivos" : "/kpis/mios")} />
        <label className="grid gap-1">Nombre<input name="nombre" required minLength={2} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Descripción<textarea name="descripcion" rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">Unidad<input name="unidad" placeholder="%, videos, leads" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Fuente<input name="fuente" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Línea base<input name="lineaBase" inputMode="decimal" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Meta<input name="meta" inputMode="decimal" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Actual<input name="actual" inputMode="decimal" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Frecuencia
            <select name="frecuencia" aria-label="Frecuencia" className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="SEMANAL">Semanal</option><option value="QUINCENAL">Quincenal</option><option value="MENSUAL">Mensual</option></select>
          </label>
        </div>
        {nivel === "persona" && puedeAsignar ? (
          <label className="grid gap-1">Persona
            <select name="personaId" aria-label="Persona" defaultValue={personaInicial} className="h-10 rounded-lg border border-[#E4E7EC] px-3">{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select>
          </label>
        ) : null}
        {nivel === "persona" ? (
          <label className="grid gap-1">Tipo
            <select name="tipo" aria-label="Tipo" className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="PRINCIPAL">Principal</option><option value="APOYO">Apoyo</option></select>
          </label>
        ) : null}
        {nivel === "area" ? (
          <label className="grid gap-1">Área
            <select name="area" aria-label="Área" className="h-10 rounded-lg border border-[#E4E7EC] px-3">{TEAMS.map((team) => <option key={team} value={team}>{TEAM_LABEL[team]}</option>)}</select>
          </label>
        ) : null}
        {nivel === "objetivo" ? (
          <label className="grid gap-1">Objetivo
            <select name="objetivoId" aria-label="Objetivo" className="h-10 rounded-lg border border-[#E4E7EC] px-3">{objetivos.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select>
          </label>
        ) : null}
        {nivel === "persona" ? (
          <label className="grid gap-1">Apoya a
            <select name="apoyaId" aria-label="KPI que apoya" className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="">Ninguno</option>{kpis.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </label>
        ) : null}
        <label className="flex items-center gap-2">Antes de cobrar<input name="bloqueado" value="1" type="checkbox" /></label>
        <label className="grid gap-1">Motivo del bloqueo<input name="motivoBloqueo" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <button className="h-10 rounded-lg bg-[#1658B0] text-white" type="submit">Crear KPI</button>
      </form>
    </div>
  )
}
