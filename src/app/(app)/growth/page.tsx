import Link from "next/link"
import { redirect } from "next/navigation"
import { EstadoChip, FiltrosGrowth, MarcaChip, TabsGrowth } from "@/components/growth-panel"
import type { Actor } from "@/lib/domain"
import { DECISION_LABEL, puedeVerGrowth } from "@/lib/growth"
import { aprendizajes, historialExperimentos, pendientesDePropuesta, vistaGrowth } from "@/server/growth"
import { requireActor } from "@/server/session"

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; marca?: string; ciclo?: string; persona?: string; etapa?: string; estado?: string }>
}) {
  const actor = await requireActor()
  if (!puedeVerGrowth(actor)) redirect("/panel")
  const params = await searchParams
  const tab = params.tab === "ciclo" || params.tab === "experimentos" || params.tab === "aprendizajes" ? params.tab : "embudo"
  const vista = await vistaGrowth(actor, { brand: params.marca, cicloId: params.ciclo })
  const marca = vista.brand
  const cicloId = vista.ciclo?.id ?? ""
  const nombreMarca = marca === "LUVANIA" ? "Luvania" : marca === "CIFES" ? "CIFES" : "Ambas"
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl text-[#15122A]">Growth</h1>
          <p className="mt-1 text-sm text-muted-foreground">Revisamos el embudo. Probamos ideas. Compartimos aprendizajes.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/growth/ciclos" className="inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-4 text-sm">Ver ciclos</Link>
          <Link href="/growth/nuevo" className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white">+ Proponer experimento</Link>
        </div>
      </div>
      <TabsGrowth tab={tab} marca={marca} ciclo={cicloId} />
      <FiltrosGrowth marca={marca} cicloId={cicloId} ciclos={vista.ciclos.map((item) => ({ id: item.id, nombre: item.nombre }))} ilustrativo={vista.ilustrativo} />
      {tab === "embudo" ? <Embudo vista={vista} nombreMarca={nombreMarca} marca={marca} cicloId={cicloId} /> : null}
      {tab === "ciclo" ? <CicloActual actor={actor} vista={vista} /> : null}
      {tab === "experimentos" ? <Historial actor={actor} params={params} /> : null}
      {tab === "aprendizajes" ? <Aprendizajes actor={actor} /> : null}
    </div>
  )
}

function Embudo({
  vista,
  nombreMarca,
  marca,
  cicloId,
}: {
  vista: Awaited<ReturnType<typeof vistaGrowth>>
  nombreMarca: string
  marca: string
  cicloId: string
}) {
  const etapas = vista.embudo?.etapas ?? []
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#E4E7EC] bg-white p-5">
        <h2 className="font-heading text-2xl">Embudo de {nombreMarca}</h2>
        <p className="text-sm text-muted-foreground">¿Dónde estamos perdiendo oportunidades?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fuente: {vista.embudo?.fuente === "CRM" ? "CRM" : "entrada manual"}
          {vista.embudo ? ` · Actualizado ${vista.embudo.updatedAt.toLocaleString("es-CO", { timeZone: "America/Bogota" })}` : ""}
        </p>
        {etapas.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Todavía no hay etapas para este ciclo. Cárguelas con el script de ejemplo.</p> : (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            {etapas.map((etapa, index) => (
              <div key={etapa.nombre} className="flex items-end gap-2">
                <div className="flex w-40 flex-col">
                  {etapa.llamada ? (
                    <p className="mb-2 rounded-lg border border-[#F5D0A9] bg-[#FFF7ED] px-2 py-1 text-center text-[11px] leading-tight text-[#C2410C]">
                      {etapa.llamada}
                      <span className="block text-[#667085]">{etapa.subllamada}</span>
                    </p>
                  ) : <span className="mb-2 block h-9" aria-hidden="true" />}
                  <div className={`rounded-xl p-4 ${etapa.destacado ? "bg-[#FEF3C7]" : "bg-[#E7F0FB]"}`}>
                    <p className="text-sm leading-tight text-[#3d4a63]">{etapa.nombre}</p>
                    <p className="font-heading text-4xl text-[#1658B0]">{etapa.valor}</p>
                    <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white"><span className="block h-full bg-[#1658B0]" style={{ width: `${Math.min(100, etapas[0] ? (etapa.valor / etapas[0].valor) * 100 : 0)}%` }} /></span>
                  </div>
                </div>
                {index < etapas.length - 1 ? <span className="mb-6 text-[#98A2B3]">→</span> : null}
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-2xl">Experimentos del ciclo</h2>
          <Link href={`/growth?tab=experimentos&marca=${marca}&ciclo=${cicloId}`} className="text-sm text-[#1658B0]">Ver todos →</Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {vista.experimentos.map((item) => {
            const nombre = item.owner?.name || item.ownerName || "Sin responsable"
            const iniciales = nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
            const hechas = item.tareas.filter((tarea) => tarea.status === "HECHA").length
            return (
              <article key={item.id} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
                <h3 className="font-medium">{item.nombre}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <MarcaChip brand={item.brand} />
                  <span className="text-xs text-muted-foreground">{item.etapaEmbudo}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm"><span className="inline-flex size-7 items-center justify-center rounded-full bg-[#1658B0] text-[10px] font-semibold text-white">{iniciales}</span>{nombre}</span>
                  <EstadoChip estado={item.estado} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Métrica: {item.metrica || "—"}{item.tareas.length ? ` · ${hechas}/${item.tareas.length} tareas` : ""}</p>
                {item.proximaRevision ? (
                  <p className="mt-2 text-sm text-muted-foreground">Revisión en {Math.max(0, Math.round((item.proximaRevision.getTime() - Date.now()) / 86_400_000))} días</p>
                ) : (
                  <Link href={`/growth/${item.id}`} className="mt-2 inline-block text-sm font-medium text-[#1658B0]">{item.estado === "BORRADOR" ? "Completar propuesta →" : "Leer propuesta →"}</Link>
                )}
              </article>
            )
          })}
        </div>
      </section>
      {vista.reunion ? <p className="rounded-lg bg-[#E7F0FB] px-4 py-3 text-sm text-[#1658B0]">Próxima reunión: {vista.reunion}</p> : null}
    </div>
  )
}

async function CicloActual({ actor, vista }: { actor: Actor; vista: Awaited<ReturnType<typeof vistaGrowth>> }) {
  const faltan = vista.ciclo ? await pendientesDePropuesta(actor, vista.ciclo.id) : []
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl">Ciclo actual{vista.ciclo ? `: ${vista.ciclo.nombre}` : ""}</h2>
      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFD] text-xs text-muted-foreground">
            <tr><th className="px-3 py-2">Persona</th><th className="px-3 py-2">Propuesta</th><th className="px-3 py-2">Marca</th><th className="px-3 py-2">Etapa</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Revisión</th></tr>
          </thead>
          <tbody>
            {vista.experimentos.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-muted-foreground">Nadie ha presentado una propuesta en este ciclo.</td></tr> : vista.experimentos.map((item) => (
              <tr key={item.id} className="border-t border-[#F0F2F5]">
                <td className="px-3 py-2">{item.owner?.name || item.ownerName}</td>
                <td className="px-3 py-2"><Link className="text-[#1658B0] hover:underline" href={`/growth/${item.id}`}>{item.nombre}</Link></td>
                <td className="px-3 py-2">{item.brand === "LUVANIA" ? "Luvania" : "CIFES"}</td>
                <td className="px-3 py-2">{item.etapaEmbudo}</td>
                <td className="px-3 py-2"><EstadoChip estado={item.estado} /></td>
                <td className="px-3 py-2">{item.proximaRevision ? item.proximaRevision.toLocaleDateString("es-CO", { timeZone: "America/Bogota" }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">Sin propuesta en el ciclo: {faltan.length ? faltan.join(", ") : "todo el equipo de Growth ya presentó."}</p>
    </section>
  )
}

async function Historial({ actor, params }: { actor: Parameters<typeof historialExperimentos>[0]; params: { persona?: string; etapa?: string; estado?: string; marca?: string } }) {
  const filas = await historialExperimentos(actor, params)
  return (
    <section className="space-y-3">
      <form className="flex flex-wrap gap-2" action="/growth">
        <input type="hidden" name="tab" value="experimentos" />
        <input name="persona" defaultValue={params.persona ?? ""} placeholder="Persona" aria-label="Persona" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm" />
        <input name="etapa" defaultValue={params.etapa ?? ""} placeholder="Etapa del embudo" aria-label="Etapa" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm" />
        <select name="estado" defaultValue={params.estado ?? ""} aria-label="Estado" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm">
          <option value="">Estado</option>
          <option value="BORRADOR">Borrador</option>
          <option value="REVISION">Revisión del equipo</option>
          <option value="PREPARACION">Preparación</option>
          <option value="EN_EJECUCION">En ejecución</option>
          <option value="ANALISIS">Análisis</option>
          <option value="CERRADO">Cerrado</option>
        </select>
        <select name="marca" defaultValue={params.marca ?? ""} aria-label="Marca del historial" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm">
          <option value="">Marca</option>
          <option value="CIFES">CIFES</option>
          <option value="LUVANIA">Luvania</option>
        </select>
        <button className="h-10 rounded-lg bg-[#1658B0] px-3 text-sm text-white" type="submit">Filtrar</button>
      </form>
      <ul className="grid gap-2">
        {filas.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-sm">
            <Link href={`/growth/${item.id}`} className="font-medium text-[#1658B0]">{item.nombre}</Link>
            <span>{item.owner?.name || item.ownerName} · {item.ciclo.nombre} · {item.etapaEmbudo}</span>
            <EstadoChip estado={item.estado} />
          </li>
        ))}
      </ul>
    </section>
  )
}

async function Aprendizajes({ actor }: { actor: Parameters<typeof aprendizajes>[0] }) {
  const filas = await aprendizajes(actor)
  return (
    <section className="grid gap-3">
      {filas.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay experimentos cerrados.</p> : filas.map((item) => (
        <article key={item.id} className="rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
          <h2 className="font-medium"><Link href={`/growth/${item.id}`} className="text-[#1658B0]">{item.nombre}</Link></h2>
          <p className="mt-1 text-muted-foreground">{item.ciclo.nombre} · Decisión: {item.decision ? DECISION_LABEL[item.decision] : "—"}</p>
          <p className="mt-2">{item.queOcurrio || "Sin relato de resultados."}</p>
          {item.evidencia ? <p className="mt-1">Evidencia: {item.evidencia}</p> : null}
        </article>
      ))}
    </section>
  )
}
