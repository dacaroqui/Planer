import { redirect } from "next/navigation"
import { MARCAS, MARCA_LABEL, TEAMS, TEAM_LABEL, puedeVerMatriz } from "@/lib/objetivos"
import { guardarObjetivoAction } from "@/server/objetivos-actions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export default async function NuevoObjetivoPage() {
  const actor = await requireActor()
  if (!puedeVerMatriz(actor)) redirect("/panel")
  const personas = await prisma.user.findMany({ where: { active: true, deactivatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-4xl">Nuevo objetivo</h1>
      <form action={guardarObjetivoAction} className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
        <label className="grid gap-1">Título<input name="titulo" required minLength={3} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Descripción<textarea name="descripcion" rows={3} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Marca
          <select name="marca" aria-label="Marca" className="h-10 rounded-lg border border-[#E4E7EC] px-3">{MARCAS.map((marca) => <option key={marca} value={marca}>{MARCA_LABEL[marca]}</option>)}</select>
        </label>
        <label className="grid gap-1">Área
          <select name="area" aria-label="Área" className="h-10 rounded-lg border border-[#E4E7EC] px-3">{TEAMS.map((team) => <option key={team} value={team}>{TEAM_LABEL[team]}</option>)}</select>
        </label>
        <label className="grid gap-1">Dueño
          <select name="duenoId" aria-label="Dueño" className="h-10 rounded-lg border border-[#E4E7EC] px-3">{personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}</select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">Inicio<input name="periodoInicio" type="date" lang="es-CO" required className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Fin<input name="periodoFin" type="date" lang="es-CO" required className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        </div>
        <label className="grid gap-1">Costo tope<input name="costoTope" inputMode="decimal" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Estado
          <select name="estado" aria-label="Estado" className="h-10 rounded-lg border border-[#E4E7EC] px-3"><option value="ABIERTO">Abierto</option><option value="EN_CURSO">En curso</option><option value="CERRADO">Cerrado</option></select>
        </label>
        <button className="h-10 rounded-lg bg-[#1658B0] text-white" type="submit">Crear objetivo</button>
      </form>
    </div>
  )
}
