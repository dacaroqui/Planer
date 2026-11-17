import { notFound } from "next/navigation"
import { Gestion } from "@/components/gestion"
import { TareasPanel } from "@/components/tareas-panel"
import { EquipoBadge, EstadoBadge, SlaBadge } from "@/components/insignias"
import { renderMarkdown } from "@/lib/markdown"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { etiquetaDeAutor } from "@/lib/permissions"
import { formatBytes, formatDate, formatDateTime } from "@/lib/format"
import { formatDuration } from "@/lib/sla"
import { trasladarAction } from "@/server/actions"
import { requireActor } from "@/server/session"
import { getDetalle } from "@/server/requests"
import { TEXTO_AVANCE_REQUERIMIENTO, avanceDesdeLista, tareaVencida } from "@/lib/avance"
import { transicionDeDetalle } from "@/lib/tablero-movimiento"
import { BRAND_LABEL, PRIORITY_LABEL, type BrandName, type PriorityName } from "@/lib/domain"
import { RESOLUCION_LABEL } from "@/lib/flujo-oficial"
import { FormularioClasificar } from "@/components/formulario-clasificar"
import { puedeGestionarTareas } from "@/server/proyectos"
import { prisma } from "@/lib/prisma"

export default async function DetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>
  searchParams: Promise<{ confirmado?: string; guardado?: string }>
}) {
  const actor = await requireActor()
  const { codigo } = await params
  const consulta = await searchParams
  const detail = await getDetalle(actor, codigo)
  if (!detail) notFound()
  const { request, sla } = detail
  const tiposArea = detail.canPriority
    ? await prisma.requestType.findMany({ where: { team: request.team, active: true }, orderBy: { name: "asc" } })
    : []
  const proyectosEmpresa = await prisma.proyecto.findMany({ where: { empresaId: request.empresaId }, orderBy: { name: "asc" } })
  const agentesTarea = await prisma.user.findMany({
    where: { active: true, areaRoles: { some: { team: request.team, role: { in: ["AGENTE", "LIDER"] } } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const tareasRaiz = request.tasks.filter((tarea) => !tarea.parentId)
  const avance = avanceDesdeLista(request.tasks, request.status)
  const ratio = Math.max(0, Math.min(100, Math.round(sla.ratio * 100)))

  return (
    <div className="space-y-6">
      <div>
        {consulta.guardado === "1" ? (
          <p className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">Clasificación guardada.</p>
        ) : null}
        {consulta.confirmado === "1" ? (
          <p className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Quedó radicado con el código {request.code}. También enviamos la confirmación al correo de los líderes del área. <a className="underline" href={`/requerimientos/${request.code}`}>Abrir este detalle</a>.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">{request.code}</p>
        <h1 className="mt-1 font-heading text-4xl leading-tight">{request.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EstadoBadge status={request.status} />
          <SlaBadge state={sla.state} />
          <EquipoBadge team={request.team} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Radicado {formatDateTime(request.createdAt)} por {request.requester.name}.</p>
        <p className="mt-2 text-sm">Siguiente paso: {detail.transitions[0]?.name ?? "No hay acciones pendientes para su rol."}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section aria-labelledby="pedido" className="space-y-3">
            <h2 id="pedido" className="font-heading text-2xl">Lo pedido</h2>
            <Card>
              <CardContent className="space-y-4 pt-6 text-sm leading-relaxed">
                <p className="whitespace-pre-wrap">{request.description}</p>
                {request.justification ? <p className="whitespace-pre-wrap"><span className="font-medium">Justificación. </span>{request.justification}</p> : null}
                {request.stepsToReproduce ? <p className="whitespace-pre-wrap"><span className="font-medium">Pasos. </span>{request.stepsToReproduce}</p> : null}
                {request.channels ? <p><span className="font-medium">Canal. </span>{request.channels}</p> : null}
                {request.expectedResult ? <p className="whitespace-pre-wrap"><span className="font-medium">Resultado esperado. </span>{request.expectedResult}</p> : null}
                <p className="text-xs text-muted-foreground">Empresa es la entidad del caso ({request.empresa.name}). Marca es la línea de comunicación ({BRAND_LABEL[request.brand as BrandName] ?? request.brand}).</p>
              </CardContent>
            </Card>
          </section>
          <section aria-labelledby="seguimiento" className="space-y-3">
          <h2 id="seguimiento" className="font-heading text-2xl">Seguimiento</h2>
          <Card>
            <CardHeader><CardTitle title={TEXTO_AVANCE_REQUERIMIENTO}>Tareas · {avance.porcentaje}%</CardTitle></CardHeader>
            <CardContent>
              <TareasPanel
                porcentaje={avance.porcentaje}
                puede={puedeGestionarTareas(actor, request.team)}
                requestId={request.id}
                projectId={request.projectId ?? undefined}
                agentes={agentesTarea}
                tareas={tareasRaiz.map((tarea) => ({
                  id: tarea.id,
                  title: tarea.title,
                  status: tarea.status,
                  dueDate: tarea.dueDate ? formatDate(tarea.dueDate) : null,
                  assignee: tarea.assignee?.name ?? "Sin responsable",
                  vencida: tareaVencida(tarea),
                }))}
              />
            </CardContent>
          </Card>
          {request.attachments.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Archivos</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {request.attachments.map((file) => (
                  <a key={file.id} href={`/api/adjuntos/${file.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted">
                    <span>{file.filename}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)} · {file.uploadedBy.name}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <Tabs defaultValue="comentarios">
            <TabsList>
              <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            <TabsContent value="comentarios" className="mt-4 grid gap-3">
              {request.comments.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p> : request.comments.map((comment) => (
                <article key={comment.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm font-medium">
                    {comment.author.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {etiquetaDeAutor(comment.author, request.team)} · {formatDateTime(comment.createdAt)}
                      {comment.internal ? " · Nota interna" : ""}
                    </span>
                  </p>
                  <div className="mt-2 text-sm [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.body) }} />
                </article>
              ))}
            </TabsContent>
            <TabsContent value="historial" className="mt-4 grid gap-3">
              {request.activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.actor ? `${activity.actor.name} · ${etiquetaDeAutor(activity.actor, request.team)}` : "Planer"} · {formatDateTime(activity.createdAt)}
                    {activity.internal ? " · Interno" : ""}
                  </p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
          </section>
        </div>
        <div className="space-y-4">
          <h2 id="gestion" className="font-heading text-2xl">Gestión</h2>
          <Card>
            <CardHeader><CardTitle>SLA</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SlaBadge state={sla.state} />
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
              </div>
              <p>Meta: {formatDuration(request.slaTargetMinutes)}. Quedan {formatDuration(sla.remainingMinutes)}.</p>
              <p>Vence: {formatDateTime(sla.dueAt)}</p>
              <p className="text-xs text-muted-foreground">{detail.jornada}. El reloj se pausa cuando se espera información del solicitante.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ficha</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Fila etiqueta="Tipo" valor={request.type.name} />
              <Fila etiqueta="Prioridad" valor={PRIORITY_LABEL[request.priority as PriorityName] ?? request.priority} />
              {request.priority !== request.prioritySuggested ? <Fila etiqueta="Prioridad sugerida" valor={PRIORITY_LABEL[request.prioritySuggested as PriorityName] ?? request.prioritySuggested} /> : null}
              <Fila etiqueta="Empresa" valor={request.empresa.name} />
              <Fila etiqueta="Proyecto" valor={request.project?.name ?? "Sin proyecto"} />
              <Fila etiqueta="Marca" valor={BRAND_LABEL[request.brand as BrandName] ?? request.brand} />
              <Fila etiqueta="Área" valor={request.area.name} />
              <Fila etiqueta="Solicitante" valor={request.requester.name} />
              <Fila etiqueta="Asignado" valor={request.assignee?.name ?? "Sin asignar"} />
              <Fila etiqueta="Fecha deseada" valor={formatDate(request.desiredDate)} />
              <Fila etiqueta="Resolución" valor={request.resolution ? (RESOLUCION_LABEL[request.resolution] ?? request.resolution) : "—"} />
              <Fila etiqueta="Fecha comprometida" valor={formatDate(request.committedDate)} />
            </CardContent>
          </Card>
          {detail.canPriority ? (
            <Card>
              <CardHeader><CardTitle>Clasificar</CardTitle></CardHeader>
              <CardContent>
                <FormularioClasificar
                  code={request.code}
                  typeId={request.typeId}
                  priority={request.priority}
                  projectId={request.projectId}
                  brand={request.brand}
                  committedDate={request.committedDate ? request.committedDate.toISOString().slice(0, 10) : ""}
                  tipos={tiposArea.map((tipo) => ({ id: tipo.id, name: tipo.name }))}
                  proyectos={proyectosEmpresa.map((proyecto) => ({ id: proyecto.id, name: proyecto.name }))}
                />
                {detail.canMove ? (
                  <form action={trasladarAction} className="mt-3">
                    <input type="hidden" name="code" value={request.code} />
                    <input type="hidden" name="team" value={request.team === "DESARROLLO" ? "MARKETING" : "DESARROLLO"} />
                    <button className="text-sm underline" type="submit">Trasladar a {request.team === "DESARROLLO" ? "Marketing" : "Desarrollo"}</button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader><CardTitle>Gestionar</CardTitle></CardHeader>
            <CardContent>
              <Gestion
                code={request.code}
                transiciones={detail.transitions.map((item) => transicionDeDetalle(item))}
                puedeAsignar={detail.canAssign}
                agentes={detail.agents.map((agent) => ({ id: agent.id, name: agent.name }))}
                asignadoId={request.assigneeId}
                fechaComprometida={request.committedDate ? request.committedDate.toISOString().slice(0, 10) : null}
                puedeComentar={detail.canCommentPublic}
                puedeNota={detail.canCommentInternal}
                puedeAdjuntar={detail.canAttach}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "" || valor === "—" || valor === "Sin asignar" || valor === "Sin proyecto") return null
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="text-right">{valor}</span>
    </div>
  )
}
