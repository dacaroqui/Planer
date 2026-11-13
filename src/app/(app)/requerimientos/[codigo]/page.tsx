import Link from "next/link"
import { notFound } from "next/navigation"
import { Gestion } from "@/components/gestion"
import { EquipoBadge, EstadoBadge, MarcaTexto, PrioridadTexto, SlaBadge } from "@/components/insignias"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ROLE_LABEL } from "@/lib/domain"
import { formatBytes, formatDate, formatDateTime } from "@/lib/format"
import { formatDuration } from "@/lib/sla"
import { requireActor } from "@/server/session"
import { getDetalle } from "@/server/requests"

export default async function DetallePage({ params }: { params: Promise<{ codigo: string }> }) {
  const actor = await requireActor()
  const { codigo } = await params
  const detail = await getDetalle(actor, codigo)
  if (!detail) notFound()
  const { request, sla } = detail
  const ratio = Math.max(0, Math.min(100, Math.round(sla.ratio * 100)))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/requerimientos" className="text-sm text-muted-foreground hover:underline">Volver al listado</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EstadoBadge status={request.status} />
          <SlaBadge state={sla.state} />
          <EquipoBadge team={request.team} />
        </div>
        <h1 className="mt-3 font-heading text-4xl leading-tight">{request.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{request.code} · radicado {formatDateTime(request.createdAt)} por {request.requester.name}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Qué se pidió</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <p className="whitespace-pre-wrap">{request.description}</p>
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">Resultado esperado</p>
                <p className="mt-1 whitespace-pre-wrap">{request.expectedResult}</p>
              </div>
              {request.resolution ? (
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Resolución</p>
                  <p className="mt-1 whitespace-pre-wrap">{request.resolution}</p>
                </div>
              ) : null}
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
                      {ROLE_LABEL[comment.author.role]} · {formatDateTime(comment.createdAt)}
                      {comment.internal ? " · Nota interna" : ""}
                    </span>
                  </p>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
                </article>
              ))}
            </TabsContent>
            <TabsContent value="historial" className="mt-4 grid gap-3">
              {request.activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.actor?.name ?? "Mesa"} · {formatDateTime(activity.createdAt)}
                    {activity.internal ? " · Interno" : ""}
                  </p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
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
              <Fila etiqueta="Prioridad" valor={<PrioridadTexto priority={request.priority} />} />
              <Fila etiqueta="Marca" valor={<MarcaTexto brand={request.brand} />} />
              <Fila etiqueta="Área" valor={request.area.name} />
              <Fila etiqueta="Solicitante" valor={request.requester.name} />
              <Fila etiqueta="Asignado" valor={request.assignee?.name ?? "Sin asignar"} />
              <Fila etiqueta="Fecha deseada" valor={formatDate(request.desiredDate)} />
              <Fila etiqueta="Aprobación" valor={request.type.requiresApproval ? "La exige el tipo" : "No la exige el tipo"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Gestionar</CardTitle></CardHeader>
            <CardContent>
              <Gestion
                code={request.code}
                transiciones={detail.transitions.map((item) => ({
                  to: item.to,
                  label: item.label,
                  requiresComment: item.requiresComment,
                }))}
                puedeAsignar={detail.canAssign}
                agentes={detail.agents.map((agent) => ({ id: agent.id, name: agent.name }))}
                asignadoId={request.assigneeId}
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
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="text-right">{valor}</span>
    </div>
  )
}
