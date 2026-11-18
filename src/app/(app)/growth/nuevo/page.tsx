import { redirect } from "next/navigation"
import { puedeVerGrowth, puedeEditarGrowth } from "@/lib/growth"
import { listarCiclos } from "@/server/growth"
import { proponerExperimentoAction } from "@/server/growth-actions"
import { requireActor } from "@/server/session"

export default async function NuevoExperimentoPage() {
  const actor = await requireActor()
  if (!puedeVerGrowth(actor)) redirect("/panel")
  if (!puedeEditarGrowth(actor)) redirect("/growth")
  const ciclos = await listarCiclos(actor)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-4xl">Experimento Growth</h1>
      <p className="text-sm text-muted-foreground">La propuesta queda en Borrador. El equipo la lee en Revisión del equipo.</p>
      <form action={proponerExperimentoAction} className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
        <label className="grid gap-1">Nombre<input name="nombre" required minLength={3} className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Marca
          <select name="brand" aria-label="Marca" className="h-10 rounded-lg border border-[#E4E7EC] px-3">
            <option value="LUVANIA">Luvania</option>
            <option value="CIFES">CIFES</option>
          </select>
        </label>
        <label className="grid gap-1">Ciclo
          <select name="cicloId" required aria-label="Ciclo" className="h-10 rounded-lg border border-[#E4E7EC] px-3">
            {ciclos.map((ciclo) => <option key={ciclo.id} value={ciclo.id}>{ciclo.nombre}</option>)}
          </select>
        </label>
        <label className="grid gap-1">Etapa del embudo<input name="etapaEmbudo" required placeholder="Asistencia, Agendamiento, Recompra…" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Métrica<input name="metrica" required className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Qué identifiqué<textarea name="problema" rows={3} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Dónde sucede<input name="donde" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        <label className="grid gap-1">Datos<textarea name="datos" rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Posible explicación<textarea name="explicacion" rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Qué encontré<textarea name="referencia" rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Mecanismo que quiero adaptar<textarea name="mecanismo" rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <label className="grid gap-1">Por qué<textarea name="porque" rows={2} className="rounded-lg border border-[#E4E7EC] px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">Valor inicial<input name="valorInicial" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Meta<input name="meta" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Comparación<input name="comparacion" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
          <label className="grid gap-1">Duración<input name="duracion" className="h-10 rounded-lg border border-[#E4E7EC] px-3" /></label>
        </div>
        <button className="h-11 rounded-lg bg-[#1658B0] text-sm font-medium text-white" type="submit">Crear experimento</button>
      </form>
    </div>
  )
}
