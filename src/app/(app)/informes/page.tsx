import { TEAMS, TEAM_LABEL } from "@/lib/domain"
import { semanaActual } from "@/server/informe"
import { listarProyectos } from "@/server/proyectos"
import { requireActor } from "@/server/session"

export default async function InformesPage({ searchParams }: { searchParams: Promise<{ semana?: string; area?: string; proyecto?: string }> }) {
  const actor = await requireActor()
  const params = await searchParams
  const corte = semanaActual()
  const proyectos = await listarProyectos(actor)
  const semana = params.semana || corte.clave
  const consulta = new URLSearchParams({ semana, ...(params.area ? { area: params.area } : {}), ...(params.proyecto ? { proyecto: params.proyecto } : {}) })
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-heading text-4xl text-[#15122A]">Informe semanal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cumplimiento de la junta: proyectos, entregables, actividades y KPIs.</p>
      </div>
      <form className="grid gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 sm:grid-cols-3" action="/informes">
        <label className="grid gap-1 text-xs">Semana
          <input name="semana" type="week" defaultValue={semana} aria-label="Semana" className="h-10 rounded-lg border border-[#E4E7EC] px-2" />
        </label>
        <label className="grid gap-1 text-xs">Área
          <select name="area" defaultValue={params.area || ""} aria-label="Área del informe" className="h-10 rounded-lg border border-[#E4E7EC] px-2"><option value="">Todas</option>{TEAMS.map((team) => <option key={team} value={team}>{TEAM_LABEL[team]}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs">Proyecto
          <select name="proyecto" defaultValue={params.proyecto || ""} aria-label="Proyecto del informe" className="h-10 rounded-lg border border-[#E4E7EC] px-2"><option value="">Todos</option>{proyectos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-3">
          <button className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm" type="submit">Ver filtros</button>
          <a href={`/api/informes?${consulta.toString()}`} className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white">Descargar PDF</a>
        </div>
      </form>
    </div>
  )
}
