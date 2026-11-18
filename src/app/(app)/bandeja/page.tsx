import { BandejaPanel } from "@/components/bandeja-panel"
import type { EntradaLinea } from "@/components/cronologia-vista"
import { esAdmin, puedeVerNotaInterna } from "@/lib/permissions"
import { type TeamName } from "@/lib/domain"
import { requireActor } from "@/server/session"
import { getDetalle } from "@/server/requests"
import { listarBandeja, puedeEntrarBandeja, tabBandeja } from "@/server/bandeja"
import { statusLabel } from "@/lib/domain"

function tipoDe(kind: string): "publica" | "interna" | "registro" | "info" {
  if (kind === "INTERNA") return "interna"
  if (kind === "REGISTRO") return "registro"
  if (kind === "SOLICITUD_INFO") return "info"
  return "publica"
}

function entradasDe(detail: NonNullable<Awaited<ReturnType<typeof getDetalle>>>): EntradaLinea[] {
  const lineas: Array<EntradaLinea & { orden: number }> = [
    ...detail.request.comments.map((item) => ({
      tipo: tipoDe(item.kind),
      id: item.id,
      autor: item.author.name,
      cuando: item.createdAt.toISOString(),
      cuerpo: item.body,
      minutos: item.minutes,
      tarea: item.tarea?.title ?? null,
      orden: item.createdAt.getTime(),
    })),
    ...detail.request.activities.filter((item) => item.kind === "STATUS" && item.field === "estado").map((item) => ({
      tipo: "estado" as const,
      id: item.id,
      cuando: item.createdAt.toISOString(),
      texto: item.fromValue && item.toValue ? `${statusLabel(item.fromValue)} → ${statusLabel(item.toValue)}` : item.message,
      orden: item.createdAt.getTime(),
    })),
  ]
  lineas.sort((a, b) => a.orden - b.orden)
  return lineas.map((entrada) => entrada.tipo === "estado"
    ? { tipo: entrada.tipo, id: entrada.id, cuando: entrada.cuando, texto: entrada.texto }
    : { tipo: entrada.tipo, id: entrada.id, autor: entrada.autor, cuando: entrada.cuando, cuerpo: entrada.cuerpo, minutos: entrada.minutos, tarea: entrada.tarea })
}

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  if (!puedeEntrarBandeja(actor)) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-2xl">Bandeja de respuesta</h1>
        <p className="mt-3 text-sm text-muted-foreground">La bandeja es para quien atiende solicitudes. Como solicitante, el seguimiento está en Mis solicitudes.</p>
      </div>
    )
  }
  const params = await searchParams
  const texto = (clave: string) => typeof params[clave] === "string" ? params[clave] : ""
  const equipo = texto("equipo") === "DESARROLLO" || texto("equipo") === "MARKETING" ? texto("equipo") as TeamName : undefined
  const tab = tabBandeja(texto("tab") || undefined)
  const data = await listarBandeja(actor, {
    tab,
    equipo,
    empresaId: texto("empresa") || undefined,
    prioridad: texto("prioridad") || undefined,
    responsable: texto("responsable") || undefined,
    soloMios: texto("mios") === "1",
  })
  const codigo = texto("codigo")
  const detail = codigo ? await getDetalle(actor, codigo) : null
  const equipos = esAdmin(actor) ? (["DESARROLLO", "MARKETING"] as TeamName[]) : [...new Set(actor.memberships.map((item) => item.team))]
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl">Bandeja de respuesta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lo que espera una respuesta del equipo, ordenado por el SLA.</p>
      </div>
      <BandejaPanel
        tab={tab}
        conteos={data.conteos}
        filas={data.filas}
        query={{
          tab,
          equipo: equipo ?? "",
          empresa: texto("empresa"),
          prioridad: texto("prioridad"),
          responsable: texto("responsable"),
          mios: texto("mios"),
          codigo,
        }}
        empresas={data.empresas}
        responsables={data.responsables}
        equipos={equipos}
        soloLectura={data.soloLectura || (detail ? !puedeVerNotaInterna(actor, detail.request.team) && !detail.canCommentPublic : false)}
        detalle={detail ? {
          code: detail.request.code,
          title: detail.request.title,
          entradas: entradasDe(detail),
          puedePublica: detail.canCommentPublic,
          puedeNota: detail.canCommentInternal,
          puedeAdjuntar: detail.canAttach,
          tareas: detail.request.tasks.filter((tarea) => !tarea.parentId).map((tarea) => ({ id: tarea.id, title: tarea.title })),
          agentes: detail.agents.map((agente) => ({ id: agente.id, name: agente.name })),
          puedeAsignar: detail.canAssign,
        } : null}
      />
    </div>
  )
}
