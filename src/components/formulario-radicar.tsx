"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClipboardListIcon, Code2Icon, HandshakeIcon, InfoIcon, LightbulbIcon, MegaphoneIcon } from "lucide-react"
import { toast } from "sonner"
import { crearProyectoRadicarAction, radicarAction } from "@/server/actions"
import { TEAM_LABEL, TEAMS, type TeamName } from "@/lib/domain"
import { iniciales } from "@/lib/planer-ui"
import { Elegir } from "@/components/ui/elegir"
import {
  erroresPaso,
  fechaEntregaRecomendada,
  hoyBogota,
  minutosDePolitica,
  textoFechaIso,
  type PoliticaEntrega,
} from "@/lib/fecha-entrega"

export type TipoOpcion = {
  id: string
  team: TeamName
  name: string
  description: string
  extra: string
}

export type EquipoOpcion = {
  key: TeamName
  name: string
  description: string
  icon: string
  color: string
}

const ICONOS: Record<string, typeof Code2Icon> = {
  codigo: Code2Icon,
  megafono: MegaphoneIcon,
  acuerdo: HandshakeIcon,
  bombilla: LightbulbIcon,
}

const COLORES: Record<string, { fondo: string; tinta: string }> = {
  azul: { fondo: "#E7F0FB", tinta: "#1658B0" },
  coral: { fondo: "#FDE8E6", tinta: "#E11D48" },
  verde: { fondo: "#E7F6EE", tinta: "#047857" },
  violeta: { fondo: "#F3E8FF", tinta: "#6D28D9" },
}

const campo = "h-11 w-full rounded-[10px] border border-[#D9DEE7] bg-white px-3 text-sm"
const area = "w-full rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2 text-sm"

export function FormularioRadicar({
  tipos,
  area: areaNombre,
  marcas,
  prioridades,
  empresas,
  proyectos,
  areas = [],
  equipos,
  politicas = [],
  ahora,
  personas = [],
  esAdministrador = false,
  liderazgos = [],
  volverHref = "/mis-solicitudes",
  embebido = false,
}: {
  tipos: TipoOpcion[]
  area: string
  marcas: { key: string; name: string }[]
  prioridades: { key: string; name: string }[]
  empresas: { id: string; name: string }[]
  proyectos: { id: string; empresaId: string; name: string }[]
  areas?: { id: string; name: string }[]
  equipos: EquipoOpcion[]
  politicas?: PoliticaEntrega[]
  ahora: string
  personas?: { id: string; name: string; team: TeamName; role: "AGENTE" | "LIDER" }[]
  esAdministrador?: boolean
  liderazgos?: TeamName[]
  volverHref?: string
  embebido?: boolean
}) {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [team, setTeam] = useState<TeamName | "">(equipos[0] ? "" : "")
  const [typeId, setTypeId] = useState("")
  const [priority, setPriority] = useState(prioridades.find((item) => item.key === "MEDIA")?.key ?? prioridades[0]?.key ?? "MEDIA")
  const [brand, setBrand] = useState(marcas.find((item) => item.key === "CIFES")?.key ?? marcas[0]?.key ?? "CIFES")
  const [empresaId, setEmpresaId] = useState(empresas.find((item) => item.name === "CIFES")?.id ?? empresas[0]?.id ?? "")
  const [projectId, setProjectId] = useState("")
  const [proyectosLocales, setProyectosLocales] = useState(proyectos)
  const [crearProyecto, setCrearProyecto] = useState(false)
  const [nombreProyecto, setNombreProyecto] = useState("")
  const [detalleProyecto, setDetalleProyecto] = useState("")
  const [equipoProyecto, setEquipoProyecto] = useState<TeamName | "">("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [justification, setJustification] = useState("")
  const [steps, setSteps] = useState("")
  const [channels, setChannels] = useState("")
  const [moduleName, setModuleName] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [desiredDate, setDesiredDate] = useState("")
  const [fechaManual, setFechaManual] = useState(false)
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const [intento, setIntento] = useState<1 | 2 | 3 | 0>(0)
  const [archivo, setArchivo] = useState("")
  const [declares, setDeclares] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const areaInicial = areas.find((item) => item.name === "Dirección") ?? areas.find((item) => item.name !== "Académico") ?? areas[0]
  const [areaId, setAreaId] = useState(areaInicial?.id ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const enviando = useRef(false)
  const visibles = useMemo(() => tipos.filter((tipo) => tipo.team === team), [tipos, team])
  const elegido = visibles.find((tipo) => tipo.id === typeId) ?? null
  const equipo = equipos.find((item) => item.key === team) ?? null
  const proyectosEmpresa = proyectosLocales.filter((item) => item.empresaId === empresaId)
  const instante = useMemo(() => new Date(ahora), [ahora])
  const recomendada = useMemo(() => fechaEntregaRecomendada({
    ahora: instante,
    prioridad: priority,
    minutosTipo: minutosDePolitica(politicas, team, typeId, priority),
  }), [instante, politicas, team, typeId, priority])
  const fechaEntrega = fechaManual ? desiredDate : recomendada
  const datosPaso = {
    team,
    title,
    description,
    typeId,
    extra: elegido?.extra ?? "",
    steps,
    channels,
    priority,
    justification,
    desiredDate: fechaEntrega,
    declares,
    ahora: instante,
  }
  const errores = erroresPaso(paso, datosPaso)
  function visible(campo: string) {
    return Boolean(tocados[campo] || intento === paso)
  }
  function tocar(campo: string) {
    setTocados((prev) => ({ ...prev, [campo]: true }))
  }
  function continuar(siguiente: 1 | 2 | 3) {
    setIntento(paso)
    if (Object.keys(erroresPaso(paso, datosPaso)).length > 0) return
    setIntento(0)
    setPaso(siguiente)
  }
  const subtitulo = paso === 2
    ? "Describe lo que necesitas para que el equipo pueda revisarlo."
    : paso === 3
      ? "Revisa los datos antes de radicar la solicitud."
      : "Cuéntanos qué necesitas y elige el equipo que puede ayudarte."

  function nombreDe(lista: { key?: string; id?: string; name: string }[], valor: string) {
    return lista.find((item) => item.key === valor || item.id === valor)?.name ?? valor
  }

  return (
    <div className="space-y-5">
      {embebido ? null : (
        <div className="space-y-2">
          <Link href={volverHref} className="inline-flex items-center gap-1 text-sm font-medium text-[#1658B0] hover:underline">
            <ArrowLeftIcon className="size-4" /> Volver a mis solicitudes
          </Link>
          <h1 className="font-heading text-3xl">Radicar solicitud</h1>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>
      )}
      <Pasos paso={paso} />
      <form onSubmit={(event) => {
        event.preventDefault()
        if (paso === 2) {
          continuar(3)
          return
        }
        if (paso !== 3) return
        setIntento(3)
        const pendientes = erroresPaso(3, datosPaso)
        if (Object.keys(pendientes).length > 0) {
          setError(pendientes.declares ?? null)
          return
        }
        setError(null)
        const data = new FormData(event.currentTarget)
        if (areaId) data.set("areaId", areaId)
        if (enviando.current) return
        enviando.current = true
        start(async () => {
          const result = await radicarAction(data)
          if (!result.ok) {
            enviando.current = false
            setError(result.error)
            toast.error(result.error)
            return
          }
          toast.success(result.message || `Radicado ${result.code}.`)
          router.push(`/requerimientos/${result.code}?confirmado=1`)
        })
      }}>
        <input type="hidden" name="team" value={team} />
        <div className={paso === 1 ? "space-y-4" : "hidden"}>
          <section className="rounded-xl border border-[#E4E7EC] bg-white p-5">
            <h2 className="text-lg font-semibold">¿A qué equipo va dirigida tu solicitud?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona la opción que mejor describa lo que necesitas.</p>
            {equipos.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No hay equipos activos en el catálogo.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Equipo">
                {equipos.map((item) => {
                  const activo = team === item.key
                  const Icono = ICONOS[item.icon] ?? Code2Icon
                  const tono = COLORES[item.color] ?? { fondo: "#F3F4F6", tinta: "#344054" }
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => { setTeam(item.key); setTypeId("") }}
                      className={activo ? "flex items-start gap-3 rounded-xl border-2 border-[#1658B0] bg-[#F4F8FE] p-5 text-left shadow-[0_8px_24px_rgba(21,18,42,0.04)]" : "flex items-start gap-3 rounded-xl border border-[#E4E7EC] bg-white p-5 text-left shadow-[0_1px_2px_rgba(21,18,42,0.04)] hover:border-[#1658B0]"}
                    >
                      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl" style={{ background: tono.fondo, color: tono.tinta }}>
                        <Icono className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-semibold">{item.name}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{item.description}</span>
                      </span>
                      <span className={activo ? "mt-1 inline-flex size-4 items-center justify-center rounded-full border border-[#1658B0]" : "mt-1 inline-flex size-4 rounded-full border border-[#D0D5DD]"} aria-hidden>
                        {activo ? <span className="size-2 rounded-full bg-[#1658B0]" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <InfoIcon className="size-4" /> El formulario se adaptará al equipo que selecciones.
            </p>
            {visible("team") ? <Aviso texto={errores.team} /> : null}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E4E7EC] pt-4">
              <Link href={volverHref} className="inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-4 text-sm">Cancelar</Link>
              <button type="button" onClick={() => continuar(2)} className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white">
                Continuar <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </section>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ClipboardListIcon className="size-3.5" /> Al radicar recibirás un número para hacer seguimiento en <Link href="/mis-solicitudes" className="text-[#1658B0] hover:underline">Mis solicitudes</Link>.
          </p>
        </div>

        <div className={paso === 2 ? "space-y-4" : "hidden"}>
          <EquipoActual equipo={equipo} onCambiar={() => setPaso(1)} />
          <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_8px_24px_rgba(21,18,42,0.04)]">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">¿Qué necesitas?</h2>
                <label className="grid gap-1.5 text-sm">
                  Título
                  <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => tocar("title")} maxLength={120} placeholder="Resume tu solicitud en una frase" className={campo} aria-invalid={visible("title") && Boolean(errores.title)} />
                  {visible("title") ? <Aviso texto={errores.title} /> : null}
                </label>
                <label className="grid gap-1.5 text-sm">
                  Descripción
                  <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => tocar("description")} rows={5} placeholder="Explica el contexto, qué ocurre y qué resultado esperas." className={area} aria-invalid={visible("description") && Boolean(errores.description)} />
                  <span className="text-xs text-muted-foreground">Si reportas un error, indica los pasos para reproducirlo.</span>
                  {visible("description") ? <Aviso texto={errores.description} /> : null}
                </label>
                <label className="grid gap-1.5 text-sm">
                  Justificación · Opcional
                  <textarea name="justification" value={justification} onChange={(event) => setJustification(event.target.value)} onBlur={() => tocar("justification")} rows={3} placeholder="¿Por qué es importante resolver esta solicitud?" className={area} aria-invalid={visible("justification") && Boolean(errores.justification)} />
                  {visible("justification") ? <Aviso texto={errores.justification} /> : null}
                </label>
                <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <InfoIcon className="mt-0.5 size-4 shrink-0" />
                  Usa datos de prueba o anonimizados. No incluyas datos personales de estudiantes, deudores, pacientes o socios.
                </p>
              </div>
              <div className="space-y-4 lg:border-l lg:border-[#E4E7EC] lg:pl-6">
                <h2 className="text-lg font-semibold">Clasificación y contexto</h2>
                <label className="grid gap-1.5 text-sm">
                  Tipo de solicitud
                  <Elegir name="typeId" ariaLabel="Tipo de solicitud" value={typeId} onValueChange={(valor) => { setTypeId(valor); tocar("typeId") }} placeholder="Selecciona un tipo" opciones={[{ value: "", label: "Selecciona un tipo" }, ...visibles.map((tipo) => ({ value: tipo.id, label: tipo.name }))]} />
                  {visible("typeId") ? <Aviso texto={errores.typeId} /> : null}
                </label>
                <label className="grid gap-1.5 text-sm">
                  Empresa
                  <Elegir name="empresaId" ariaLabel="Empresa" value={empresaId} onValueChange={(valor) => { setEmpresaId(valor); setProjectId("") }} opciones={empresas.map((item) => ({ value: item.id, label: item.name }))} />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Marca
                  <Elegir name="brand" ariaLabel="Marca" value={brand} onValueChange={setBrand} opciones={marcas.map((item) => ({ value: item.key, label: item.name }))} />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Proyecto · Opcional
                  <Elegir name="projectId" ariaLabel="Proyecto" value={projectId} onValueChange={(valor) => {
                    if (valor === "__crear__") {
                      setEquipoProyecto(team)
                      setCrearProyecto(true)
                      return
                    }
                    setProjectId(valor)
                  }} placeholder="Sin proyecto" opciones={[{ value: "", label: "Sin proyecto" }, ...proyectosEmpresa.map((item) => ({ value: item.id, label: item.name })), { value: "__crear__", label: "+ Crear proyecto" }]} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    Prioridad sugerida
                    <Elegir name="priority" ariaLabel="Prioridad sugerida" value={priority} onValueChange={setPriority} opciones={prioridades.map((item) => ({ value: item.key, label: item.name }))} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    Fecha de entrega esperada
                    <input name="desiredDate" type="date" lang="es-CO" min={hoyBogota(instante)} value={fechaEntrega} onChange={(event) => { setFechaManual(true); setDesiredDate(event.target.value); tocar("desiredDate") }} onBlur={() => tocar("desiredDate")} className={campo} aria-invalid={visible("desiredDate") && Boolean(errores.desiredDate)} />
                    <span className="text-xs text-muted-foreground">
                      Recomendada según prioridad: {textoFechaIso(recomendada)}
                      {fechaManual ? <button type="button" className="ml-2 font-medium text-[#1658B0] hover:underline" onClick={() => { setFechaManual(false); setDesiredDate(recomendada) }}>Usar recomendada</button> : null}
                    </span>
                    {visible("desiredDate") ? <Aviso texto={errores.desiredDate} /> : null}
                  </label>
                </div>
                {team && (esAdministrador || liderazgos.includes(team)) ? (
                  <label className="grid gap-1.5 text-sm">
                    Asignar a · Opcional
                    <Elegir name="assigneeId" ariaLabel="Asignar a" value={assigneeId} onValueChange={setAssigneeId} placeholder="Sin asignar todavía" opciones={[{ value: "", label: "Sin asignar todavía" }, ...personas.filter((persona) => persona.team === team).map((persona) => ({ value: persona.id, label: persona.name, iniciales: iniciales(persona.name) }))]} />
                  </label>
                ) : team ? (
                  <p className="text-sm text-muted-foreground">
                    Llegará al líder de {TEAM_LABEL[team]} para asignar{personas.some((persona) => persona.team === team && persona.role === "LIDER") ? `: ${personas.filter((persona) => persona.team === team && persona.role === "LIDER").map((persona) => persona.name).join(", ")}` : ""}.
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">El equipo confirmará la prioridad y la fecha de atención.</p>
                {areas.length > 0 ? (
                  <label className="grid gap-1.5 text-sm">
                    Área de quien pide el trabajo
                    <Elegir name="areaId" ariaLabel="Área de quien pide el trabajo" value={areaId} onValueChange={setAreaId} opciones={areas.map((item) => ({ value: item.id, label: item.name }))} />
                    <span className="text-xs text-muted-foreground">Como administrador, elija el área. No queda radicado en Académico por defecto.</span>
                  </label>
                ) : <p className="text-xs text-muted-foreground">Se radica desde {areaNombre}.</p>}
              </div>
            </div>
            <div className="mt-6 grid gap-4 border-t border-[#E4E7EC] pt-4">
              {elegido?.extra === "pasos" ? (
                <label className="grid gap-1.5 text-sm">
                  Pasos para reproducir
                  <textarea name="stepsToReproduce" value={steps} onChange={(event) => setSteps(event.target.value)} onBlur={() => tocar("steps")} rows={4} placeholder="Use datos de prueba, nunca datos reales de una persona." className={area} aria-invalid={visible("steps") && Boolean(errores.steps)} />
                  {visible("steps") ? <Aviso texto={errores.steps} /> : null}
                </label>
              ) : null}
              {elegido?.extra === "canal" ? (
                <label className="grid gap-1.5 text-sm">
                  Canal
                  <input name="channels" value={channels} onChange={(event) => setChannels(event.target.value)} onBlur={() => tocar("channels")} placeholder="Instagram, sitio web, WhatsApp…" className={campo} aria-invalid={visible("channels") && Boolean(errores.channels)} />
                  {visible("channels") ? <Aviso texto={errores.channels} /> : null}
                </label>
              ) : null}
              {team === "DESARROLLO" ? (
                <label className="grid gap-1.5 text-sm">
                  Módulo o sistema · Opcional
                  <input name="moduleName" value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="CRM, sitio web, aula virtual…" className={campo} />
                </label>
              ) : null}
              <label className="grid gap-1.5 text-sm">
                Archivo · Opcional
                <input name="archivo" type="file" className="block w-full text-sm" onChange={(event) => setArchivo(event.target.files?.[0]?.name ?? "")} />
                <span className="text-xs text-muted-foreground">Máximo 25 MB.{archivo ? ` ${archivo}` : ""}</span>
              </label>
            </div>
            {error && paso === 2 ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E4E7EC] pt-4">
              <button type="button" onClick={() => setPaso(1)} className="inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-4 text-sm">Volver</button>
              <button type="button" onClick={() => continuar(3)} className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white">
                Revisar solicitud <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </section>
        </div>

        <div className={paso === 3 ? "space-y-4" : "hidden"}>
          <EquipoActual equipo={equipo} onCambiar={() => setPaso(1)} />
          <section className="rounded-xl border border-[#E4E7EC] bg-white p-5">
            <h2 className="text-lg font-semibold">Revisa tu solicitud</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Resumen etiqueta="Equipo" valor={equipo?.name ?? (team ? TEAM_LABEL[team] : "")} />
              <Resumen etiqueta="Tipo de solicitud" valor={elegido?.name ?? ""} />
              <Resumen etiqueta="Título" valor={title} />
              <Resumen etiqueta="Empresa" valor={nombreDe(empresas, empresaId)} />
              <Resumen etiqueta="Marca" valor={nombreDe(marcas, brand)} />
              <Resumen etiqueta="Proyecto" valor={projectId ? nombreDe(proyectosLocales, projectId) : "Sin proyecto"} />
              <Resumen etiqueta="Prioridad sugerida" valor={nombreDe(prioridades, priority)} />
              <Resumen etiqueta="Fecha de entrega esperada" valor={fechaEntrega ? textoFechaIso(fechaEntrega) : "Sin fecha"} />
              <div className="sm:col-span-2"><Resumen etiqueta="Descripción" valor={description} /></div>
              {justification ? <div className="sm:col-span-2"><Resumen etiqueta="Justificación" valor={justification} /></div> : null}
              {elegido?.extra === "pasos" ? <div className="sm:col-span-2"><Resumen etiqueta="Pasos para reproducir" valor={steps} /></div> : null}
              {elegido?.extra === "canal" ? <Resumen etiqueta="Canal" valor={channels} /> : null}
              {moduleName ? <Resumen etiqueta="Módulo o sistema" valor={moduleName} /> : null}
              {archivo ? <Resumen etiqueta="Archivo" valor={archivo} /> : null}
            </dl>
            <div className="mt-4 grid gap-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="declares" value="1" checked={declares} onChange={(event) => { setDeclares(event.target.checked); tocar("declares") }} className="mt-1" />
                <span>Confirmo que este requerimiento no contiene datos personales sensibles.</span>
              </label>
              {visible("declares") ? <Aviso texto={errores.declares} /> : null}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="reviewedPersonalData" value="1" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />
                <span>Si el sistema detecta algo parecido a una cédula o un celular, confirmo que ya lo revisé.</span>
              </label>
            </div>
            {error && paso === 3 ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E4E7EC] pt-4">
              <button type="button" onClick={() => setPaso(2)} className="inline-flex h-10 items-center rounded-lg border border-[#E4E7EC] bg-white px-4 text-sm">Volver</button>
              <button type="submit" disabled={pending || !declares} className="inline-flex h-10 items-center rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white disabled:opacity-50">
                {pending ? "Enviando…" : "Radicar"}
              </button>
            </div>
          </section>
        </div>
      </form>
      {crearProyecto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15122A]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="crear-proyecto-titulo">
          <div className="w-full max-w-md rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-xl">
            <h2 id="crear-proyecto-titulo" className="font-heading text-xl">Crear proyecto</h2>
            <p className="mt-1 text-sm text-muted-foreground">Queda a su nombre y se selecciona en esta solicitud.</p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm">
                Nombre
                <input value={nombreProyecto} onChange={(event) => setNombreProyecto(event.target.value)} className={campo} placeholder="Nombre del proyecto" />
              </label>
              <label className="grid gap-1.5 text-sm">
                Equipo
                <Elegir ariaLabel="Equipo del proyecto" value={equipoProyecto} onValueChange={(valor) => setEquipoProyecto(valor as TeamName)} opciones={TEAMS.map((item) => ({ value: item, label: TEAM_LABEL[item] }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                Descripción · Opcional
                <textarea value={detalleProyecto} onChange={(event) => setDetalleProyecto(event.target.value)} rows={3} className={area} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-lg border border-[#E4E7EC] px-4 text-sm" onClick={() => setCrearProyecto(false)}>Cancelar</button>
              <button type="button" disabled={pending || nombreProyecto.trim().length < 3 || !equipoProyecto} className="h-10 rounded-lg bg-[#1658B0] px-4 text-sm font-medium text-white disabled:opacity-50" onClick={() => {
                const data = new FormData()
                data.set("empresaId", empresaId)
                data.set("name", nombreProyecto)
                data.set("description", detalleProyecto)
                data.set("team", equipoProyecto)
                start(async () => {
                  const result = await crearProyectoRadicarAction(data)
                  if (!result.ok || !result.id) {
                    toast.error(result.ok ? "No se pudo crear el proyecto." : result.error)
                    return
                  }
                  setProyectosLocales((prev) => [...prev, { id: result.id!, empresaId, name: result.resumen || nombreProyecto.trim() }])
                  setProjectId(result.id)
                  setNombreProyecto("")
                  setDetalleProyecto("")
                  setCrearProyecto(false)
                  toast.success(result.message || "Proyecto creado.")
                })
              }}>Guardar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Aviso({ texto }: { texto?: string }) {
  if (!texto) return null
  return <span className="text-xs text-red-700">{texto}</span>
}

function Pasos({ paso }: { paso: 1 | 2 | 3 }) {
  const items = [
    { n: 1 as const, label: "Equipo" },
    { n: 2 as const, label: "Detalles" },
    { n: 3 as const, label: "Revisar" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-sm text-muted-foreground">Paso {paso} de 3</p>
      <ol className="flex flex-1 flex-wrap items-center justify-center gap-2">
        {items.map((item, index) => {
          const hecho = item.n < paso
          const activo = item.n === paso
          return (
            <li key={item.label} className="flex items-center gap-2">
              {index > 0 ? <span className="hidden h-px w-8 bg-[#E4E7EC] sm:block" /> : null}
              <span className={hecho || activo ? "inline-flex size-7 items-center justify-center rounded-full bg-[#1658B0] text-sm font-semibold text-white" : "inline-flex size-7 items-center justify-center rounded-full bg-[#E5E7EB] text-sm text-[#667085]"}>
                {hecho ? <CheckIcon className="size-3.5" /> : item.n}
              </span>
              <span className={activo ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{item.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function EquipoActual({ equipo, onCambiar }: { equipo: EquipoOpcion | null; onCambiar: () => void }) {
  if (!equipo) return null
  const Icono = ICONOS[equipo.icon] ?? Code2Icon
  const tono = COLORES[equipo.color] ?? { fondo: "#F3F4F6", tinta: "#344054" }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="inline-flex size-8 items-center justify-center rounded-lg" style={{ background: tono.fondo, color: tono.tinta }}>
          <Icono className="size-4" />
        </span>
        Equipo: <strong>{equipo.name}</strong>
      </span>
      <button type="button" onClick={onCambiar} className="text-sm font-medium text-[#1658B0] hover:underline">Cambiar equipo</button>
    </div>
  )
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap">{valor || "—"}</dd>
    </div>
  )
}
