import { notFound, redirect } from "next/navigation"
import { MARCAS, MARCA_LABEL, TEAMS, TEAM_LABEL, puedeEditarArea, puedeVerMatriz } from "@/lib/objetivos"
import { guardarObjetivoAction } from "@/server/objetivos-actions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import type { TeamName } from "@/lib/domain"

export default async function EditarObjetivoPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const { id } = await params
  const objetivo = await prisma.objetivo.findUnique({ where: { id } })
  if (!objetivo) notFound()
  if (!puedeEditarArea(actor, objetivo.area as TeamName)) redirect("/objetivos")
  const personas = await prisma.user.findMany({ where: { active: true, deactivatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  const inicio = objetivo.periodoInicio.toISOString().slice(0, 10)
  const fin = objetivo.periodoFin.toISOString().slice(0, 10)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-4xl">Editar objetivo</h1>
      <form action={guardarObjetivoAction} className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
        <input type="hidden" name="id" value={objetivo.id} />
        <label className="grid gap-1">Título<input name="titulo" required minLength={3} defaultValue={objetivo.titulo} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Descripción<textarea name="descripcion" rows={3} defaultValue={objetivo.descripcion} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Marca
          <select name="marca" aria-label="Marca" defaultValue={objetivo.marca} className="h-10 rounded-lg border border-[#E4E7EC] px-3">{MARCAS.map((marca) => <option key={marca} value={marca}>{MARCA_LABEL[marca]}</option>)}</select>
        </label>
        <label className="grid gap-1">Área
          <select name="area" aria-label="Área" defaultValue={objetivo.area} className="h-10 rounded-lg border border-[#E4E7EC] px-3">{TEAMS.map((team) => <option key={team} value={team}>{TEAM_LABEL[team]}</option>)}</select>
        </label>
        <label className="grid gap-1">Dueño
          <select name="duenoId" aria-label="Dueño" defaultValue={objetivo.duenoId} className="h-10 rounded-lg border border-[#E4E7EC] px-3">{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">Inicio<input name="periodoInicio" type="date" lang="es-CO" required defaultValue={inicio} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Fin<input name="periodoFin" type="date" lang="es-CO" required defaultValue={fin} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        </div>
        <label className="grid gap-1">Costo tope<input name="costoTope" inputMode="decimal" defaultValue={objetivo.costoTope?.toString() ?? ""} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Estado
          <select name="estado" aria-label="Estado" defaultValue={objetivo.estado} className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="ABIERTO">Abierto</option><option value="EN_CURSO">En curso</option><option value="CERRADO">Cerrado</option></select>
        </label>
        <button className="h-10 rounded-lg bg-[#1658B0] text-white" type="submit">Guardar objetivo</button>
      </form>
    </div>
  )
}
