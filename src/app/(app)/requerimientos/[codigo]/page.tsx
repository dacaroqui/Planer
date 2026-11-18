import { notFound } from "next/navigation"
import { MenuEliminarRequerimiento } from "@/components/confirmar-eliminar"
import { FichaSeguimiento, LineaEstados } from "@/components/seguimiento-solicitud"
import { Gestion } from "@/components/gestion"
import { TareasPanel } from "@/components/tareas-panel"
import { EquipoBadge, EstadoBadge, SlaBadge } from "@/components/insignias"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Compositor } from "@/components/compositor"
import { Cronologia, type EntradaLinea } from "@/components/cronologia-vista"
import { formatBytes, formatDate, formatDateTime } from "@/lib/format"
import { formatDuration } from "@/lib/sla"
import { trasladarAction } from "@/server/actions"
import { requireActor } from "@/server/session"
import { getDetalle } from "@/server/requests"
import { TEXTO_AVANCE_REQUERIMIENTO, avanceDesdeLista, tareaVencida } from "@/lib/avance"
import { transicionDeDetalle } from "@/lib/tablero-movimiento"
import { BRAND_LABEL, PRIORITY_LABEL, statusLabel, type BrandName, type PriorityName } from "@/lib/domain"
import { armarEtapas, pasoEsperado } from "@/lib/seguimiento"
import { RESOLUCION_LABEL } from "@/lib/flujo-oficial"
import { FormularioClasificar } from "@/components/formulario-clasificar"
import { puedeGestionarTareas } from "@/server/proyectos"
import { prisma } from "@/lib/prisma"
import { DateTime } from "luxon"
import { ZONE } from "@/lib/time"

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
  const notaPrefill = request.comments.filter((item) => item.kind === "REGISTRO" && item.compartir).map((item) => item.body).join("\n\n")
  const otras = await prisma.request.findMany({
    where: { requesterId: request.requesterId, NOT: { id: request.id } },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: { code: true, title: true, status: true, team: true, requesterId: true },
  })
  const principal = detail.transitions.find((item) => item.to !== "CANCELADO" && item.to !== "RECHAZADO")
  const entradas: EntradaLinea[] = [
    ...request.comments.map((item) => ({
      tipo: (item.kind === "INTERNA" ? "interna" : item.kind === "REGISTRO" ? "registro" : item.kind === "SOLICITUD_INFO" ? "info" : "publica") as "publica" | "interna" | "registro" | "info",
      id: item.id,
      autor: item.author.name,
      cuando: item.createdAt.toISOString(),
      cuerpo: item.body,
      minutos: item.minutes,
      tarea: item.tarea?.title ?? null,
      adjuntos: item.adjuntos.map((archivo) => ({ id: archivo.id, filename: archivo.filename, mimeType: archivo.mimeType })),
    })),
    ...request.activities.filter((item) => item.kind === "STATUS" && item.field === "estado").map((item) => ({
      tipo: "estado" as const,
      id: item.id,
      cuando: item.createdAt.toISOString(),
      texto: item.fromValue && item.toValue ? `${statusLabel(item.fromValue)} → ${statusLabel(item.toValue)}` : item.message,
    })),
  ].sort((a, b) => a.cuando.localeCompare(b.cuando))

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
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="font-heading text-4xl leading-tight">{request.title}</h1>
          {actor.isAdmin ? <MenuEliminarRequerimiento code={request.code} title={request.title} /> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EstadoBadge status={request.status} />
          <SlaBadge state={sla.state} />
          <EquipoBadge team={request.team} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Radicado el {formatDateTime(request.createdAt)} por {request.requester.name}.</p>
        {request.resolutionNote ? <p className="mt-3 rounded-lg bg-[#F4F8FE] px-3 py-2 text-sm"><span className="font-medium">Qué se hizo. </span>{request.resolutionNote}</p> : null}
        {principal ? <p className="mt-3 text-sm">Siguiente paso: <a href="#gestion" className="font-medium text-[#1658B0] hover:underline">{principal.name}</a></p> : null}
        <div className="mt-4 rounded-xl border border-[#dfe1e6] bg-white p-4">
          <FichaSeguimiento
            codigo={request.code}
            etapas={armarEtapas({
              status: request.status,
              createdAt: request.createdAt,
              updatedAt: request.updatedAt,
              cambios: request.activities.filter((item) => item.kind === "STATUS" && item.field === "estado").map((item) => ({ toValue: item.toValue, createdAt: item.createdAt })),
            })}
            responsable={request.assignee?.name ?? "Sin responsable todavía"}
            sla={sla.state}
            vence={sla.dueAt ? sla.dueAt.toISOString() : null}
            paso={pasoEsperado(request.status)}
            ctaHref="#gestion"
          />
        </div>
      </div>
      <LineaEstados cambios={request.activities.filter((item) => item.kind === "STATUS" && item.field === "estado").map((item) => ({
        id: item.id,
        cuando: item.createdAt.toISOString(),
        texto: item.fromValue && item.toValue ? `${statusLabel(item.fromValue)} → ${statusLabel(item.toValue)}. ${item.message}` : item.message,
        autor: item.actor?.name ?? "Planer",
      }))} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 space-y-8 lg:order-1">
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
          <section aria-labelledby="cronologia" className="space-y-3">
            <h2 id="cronologia" className="font-heading text-2xl">Actividad</h2>
            <Cronologia entradas={entradas} />
            <Compositor
              code={request.code}
              puedePublica={detail.canCommentPublic}
              puedeNota={detail.canCommentInternal}
              puedeAdjuntar={detail.canAttach}
              esSolicitante={actor.id === request.requesterId}
              tareas={tareasRaiz.map((tarea) => ({ id: tarea.id, title: tarea.title }))}
            />
          </section>
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <Card>
            <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
            <CardContent>
              <Gestion
                panel
                code={request.code}
                transiciones={detail.transitions.map((item) => transicionDeDetalle(item))}
                puedeAsignar={detail.canAssign}
                agentes={detail.agents.map((agent) => ({ id: agent.id, name: agent.name }))}
                asignadoId={request.assigneeId}
                fechaComprometida={request.committedDate ? DateTime.fromJSDate(request.committedDate).setZone(ZONE).toISODate() : null}
                puedeComentar={detail.canCommentPublic}
                puedeNota={detail.canCommentInternal}
                puedeAdjuntar={detail.canAttach}
                notaPrefill={notaPrefill}
                soloTransiciones
                estado={request.status}
                prioridad={PRIORITY_LABEL[request.priority as PriorityName] ?? request.priority}
                sla={sla.state}
                responsable={request.assignee?.name ?? ""}
                fechaEntrega={request.desiredDate ? DateTime.fromJSDate(request.desiredDate).setZone(ZONE).toISODate() ?? "" : ""}
                hoy={DateTime.now().setZone(ZONE).toISODate() ?? ""}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle title={TEXTO_AVANCE_REQUERIMIENTO}>Tareas</CardTitle></CardHeader>
            <CardContent>
              <TareasPanel
                porcentaje={avance.porcentaje}
                puede={puedeGestionarTareas(actor, request.team)}
                puedeEliminar={actor.isAdmin}
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
                  horasEstimadas: tarea.horasEstimadas === null ? null : Number(tarea.horasEstimadas),
                  horasReales: tarea.horasReales === null ? null : Number(tarea.horasReales),
                }))}
              />
            </CardContent>
          </Card>
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
              <Fila etiqueta="Fecha de entrega esperada" valor={formatDate(request.desiredDate)} />
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
            <CardHeader><CardTitle>Otras solicitudes de este solicitante</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {otras.filter((item) => item.requesterId === actor.id || actor.isAdmin || item.team === request.team).length === 0 ? <p className="text-muted-foreground">No hay otras solicitudes visibles.</p> : otras.filter((item) => item.requesterId === actor.id || actor.isAdmin || item.team === request.team).map((item) => (
                <a key={item.code} href={`/requerimientos/${item.code}`} className="hover:underline">{item.code} · {item.title}</a>
              ))}
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
