import { notFound, redirect } from "next/navigation"
import { DECISION_LABEL, ESTADO_LABEL, puedeEditarGrowth, puedeVerGrowth, siguienteEstado } from "@/lib/growth"
import { avanzarExperimentoAction, comentarExperimentoAction, enlaceExperimentoAction, tareaExperimentoAction } from "@/server/growth-actions"
import { fichaExperimento } from "@/server/growth"
import { DomainError } from "@/lib/domain"
import { requireActor } from "@/server/session"
import { NombreMiga } from "@/components/migas"

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor()
  if (!puedeVerGrowth(actor)) redirect("/panel")
  const { id } = await params
  let ficha
  try {
    ficha = await fichaExperimento(actor, id)
  } catch (error) {
    if (error instanceof DomainError) notFound()
    throw error
  }
  const destino = siguienteEstado(ficha.estado)
  const edita = puedeEditarGrowth(actor)
  const hechas = ficha.tareas.filter((tarea) => tarea.status === "HECHA").length
  const responsable = ficha.owner?.name || ficha.ownerName
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <NombreMiga nombre={ficha.nombre} />
      <h1 className="font-heading text-4xl">{ficha.nombre}</h1>
      <section className="rounded-xl border border-[#E4E7EC] bg-white p-4">
        <h2 className="font-medium">1. Resumen</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div>Responsable: {responsable}</div>
          <div>Marca: {ficha.brand === "LUVANIA" ? "Luvania" : "CIFES"}</div>
          <div>Ciclo: {ficha.ciclo.nombre}</div>
          <div>Etapa del embudo: {ficha.etapaEmbudo}</div>
          <div>Estado: {ESTADO_LABEL[ficha.estado]}</div>
          <div>Decisión: {ficha.decision ? DECISION_LABEL[ficha.decision] : "—"}</div>
        </dl>
      </section>
      <Seccion n="2" titulo="Problema y evidencia">
        <p>{ficha.problema}</p>
        <p>Dónde sucede: {ficha.donde}</p>
        <p>Datos: {ficha.datos}</p>
        <p>Posible explicación: {ficha.explicacion}</p>
      </Seccion>
      <Seccion n="3" titulo="Referencia y propuesta">
        <p>Qué encontré: {ficha.referencia}</p>
        <p>Mecanismo: {ficha.mecanismo}</p>
        <p>Por qué: {ficha.porque}</p>
      </Seccion>
      <Seccion n="4" titulo="Hipótesis y medición">
        <p>Métrica: {ficha.metrica}</p>
        <p>Valor inicial: {ficha.valorInicial || "—"} · Meta: {ficha.meta || "—"}</p>
        <p>Comparación: {ficha.comparacion || "—"} · Duración: {ficha.duracion || "—"}</p>
      </Seccion>
      <Seccion n="5" titulo="Revisión del equipo">
        <ul className="grid gap-2">
          {ficha.comentarios.length === 0 ? <li className="text-muted-foreground">Todavía no hay comentarios.</li> : ficha.comentarios.map((item) => (
            <li key={item.id}><span className="font-medium">{item.author.name}. </span>{item.body}</li>
          ))}
        </ul>
        {edita ? (
          <form action={comentarExperimentoAction} className="mt-3 grid gap-2">
            <input type="hidden" name="id" value={ficha.id} />
            <textarea name="body" required minLength={2} rows={3} aria-label="Comentario" placeholder="Pregunta o ajuste acordado" className="rounded-lg border border-[#E4E7EC] px-3 py-2" />
            <button className="h-10 w-fit rounded-lg bg-[#1658B0] px-3 text-sm text-white" type="submit">Comentar</button>
          </form>
        ) : null}
      </Seccion>
      <Seccion n="6" titulo="Plan de ejecución">
        <p>{hechas} de {ficha.tareas.length} tareas hechas.</p>
        <ul className="mt-2 grid gap-1">
          {ficha.tareas.map((tarea) => (
            <li key={tarea.id}>{tarea.title} · {tarea.status === "HECHA" ? "Hecha" : tarea.status === "EN_CURSO" ? "En curso" : "Por hacer"} · {tarea.assignee?.name ?? "Sin responsable"}{tarea.dueDate ? ` · ${tarea.dueDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}` : ""}</li>
          ))}
        </ul>
        {edita ? (
          <form action={tareaExperimentoAction} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="id" value={ficha.id} />
            <input name="title" required minLength={3} aria-label="Tarea" placeholder="Nueva tarea" className="h-10 rounded-lg border border-[#E4E7EC] px-3 sm:col-span-2" />
            <input name="dueDate" type="date" aria-label="Fecha de la tarea" className="h-10 rounded-lg border border-[#E4E7EC] px-3" />
            <button className="h-10 rounded-lg border border-[#1658B0] text-sm text-[#1658B0]" type="submit">Agregar tarea</button>
          </form>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">Estas tareas también aparecen en Planner, enlazadas a esta ficha. No se duplican.</p>
      </Seccion>
      <Seccion n="7" titulo="Resultados y aprendizaje">
        <p>{ficha.queOcurrio || "Todavía no hay resultados."}</p>
        {ficha.evidencia ? <p>Evidencia: {ficha.evidencia}</p> : null}
        {ficha.limitaciones ? <p>Limitaciones: {ficha.limitaciones}</p> : null}
      </Seccion>
      <section className="rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
        <h2 className="font-medium">Referencias</h2>
        <ul className="mt-2 grid gap-1">
          {ficha.enlaces.map((item) => <li key={item.id}><a className="text-[#1658B0] underline" href={item.url}>{item.titulo}</a></li>)}
        </ul>
        {edita ? (
          <form action={enlaceExperimentoAction} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="id" value={ficha.id} />
            <input name="titulo" aria-label="Título del enlace" placeholder="Título" className="h-10 rounded-lg border border-[#E4E7EC] px-3" />
            <input name="url" required aria-label="URL" placeholder="https://" className="h-10 rounded-lg border border-[#E4E7EC] px-3" />
            <button className="h-10 rounded-lg border border-[#E4E7EC] text-sm sm:col-span-2" type="submit">Agregar enlace</button>
          </form>
        ) : null}
      </section>
      {edita && destino ? (
        <form action={avanzarExperimentoAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={ficha.id} />
          {destino === "CERRADO" ? (
            <select name="decision" required aria-label="Decisión" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm">
              <option value="">Decisión</option>
              <option value="ADOPTAR">Adoptar</option>
              <option value="ITERAR">Iterar</option>
              <option value="DESCARTAR">Descartar</option>
              <option value="INCONCLUSO">Inconcluso</option>
            </select>
          ) : null}
          <button className="h-10 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white" type="submit">Pasar a {ESTADO_LABEL[destino]}</button>
        </form>
      ) : null}
    </div>
  )
}

function Seccion({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E4E7EC] bg-white p-4 text-sm">
      <h2 className="font-medium">{n}. {titulo}</h2>
      <div className="mt-2 grid gap-1">{children}</div>
    </section>
  )
}
