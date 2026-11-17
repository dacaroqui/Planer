"use client"

import { useMemo, useState, useTransition } from "react"
import { radicarAction } from "@/server/actions"
import { SelectorArchivo } from "@/components/archivo"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { avisoDatosPersonales } from "@/lib/datos-personales"
import { PRIORITY_LABEL, TEAM_LABEL, type TeamName } from "@/lib/domain"

export type TipoOpcion = {
  id: string
  team: TeamName
  name: string
  description: string
  extra: string
}

export function FormularioRadicar({
  tipos,
  area,
  marcas,
  prioridades,
  empresas,
  proyectos,
}: {
  tipos: TipoOpcion[]
  area: string
  marcas: { key: string; name: string }[]
  prioridades: { key: string; name: string }[]
  empresas: { id: string; name: string }[]
  proyectos: { id: string; empresaId: string; name: string }[]
}) {
  const [team, setTeam] = useState<TeamName | "">("")
  const [typeId, setTypeId] = useState("")
  const [priority, setPriority] = useState("MEDIA")
  const [brand, setBrand] = useState(marcas[0]?.key ?? "CIFES")
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "")
  const [projectId, setProjectId] = useState("")
  const [declares, setDeclares] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const visibles = useMemo(() => tipos.filter((tipo) => tipo.team === team), [tipos, team])
  const elegido = visibles.find((tipo) => tipo.id === typeId) ?? null

  if (!team) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">Elija el área antes de ver el formulario. El resto de los campos depende de esa elección.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["DESARROLLO", "MARKETING"] as const).map((opcion) => (
            <Button key={opcion} type="button" size="lg" variant="outline" className="h-20" onClick={() => setTeam(opcion)}>
              {TEAM_LABEL[opcion]}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        if (!declares) {
          setError("Confirme que este requerimiento no contiene datos personales sensibles.")
          return
        }
        const data = new FormData(event.currentTarget)
        data.set("team", team)
        data.set("typeId", typeId)
        data.set("priority", priority)
        data.set("brand", brand)
        data.set("empresaId", empresaId)
        if (projectId) data.set("projectId", projectId)
        data.set("declares", "1")
        data.set("reviewedPersonalData", reviewed ? "1" : "0")
        start(async () => {
          const result = await radicarAction(data)
          if (result && !result.ok) setError(result.error)
        })
      }}
    >
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
        <span>Área: <strong>{TEAM_LABEL[team]}</strong></span>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setTeam(""); setTypeId("") }}>Cambiar área</Button>
      </div>
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">{avisoDatosPersonales()}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Tipo">
          <Select value={typeId || undefined} onValueChange={setTypeId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Elija el tipo" /></SelectTrigger>
            <SelectContent>
              {visibles.map((tipo) => <SelectItem key={tipo.id} value={tipo.id}>{tipo.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Prioridad sugerida">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {prioridades.map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Empresa">
          <Select value={empresaId} onValueChange={(value) => { setEmpresaId(value); setProjectId("") }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              {empresas.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Proyecto (opcional)">
          <Select value={projectId || "NINGUNO"} onValueChange={(value) => setProjectId(value === "NINGUNO" ? "" : value)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NINGUNO">Sin proyecto</SelectItem>
              {proyectos.filter((item) => item.empresaId === empresaId).map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Marca">
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {marcas.map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Fecha deseada (opcional)">
          <Input name="desiredDate" type="date" lang="es-CO" />
        </Campo>
      </div>
      {elegido ? <p className="text-sm text-muted-foreground">{elegido.description}</p> : null}
      <Campo etiqueta="Título">
        <Input name="title" required minLength={5} maxLength={120} placeholder="Qué necesita, en una frase" />
      </Campo>
      <Campo etiqueta="Descripción">
        <Textarea name="description" required minLength={20} rows={6} placeholder="Contexto, a quién afecta y desde cuándo pasa. Sin datos personales." />
      </Campo>
      <Campo etiqueta={priority === "CRITICA" ? "Justificación (obligatoria si es crítica)" : "Justificación (opcional)"}>
        <Textarea name="justification" rows={3} placeholder="Para qué se necesita y qué pasa si no se hace." />
      </Campo>
      {elegido?.extra === "pasos" ? (
        <Campo etiqueta="Pasos para reproducir">
          <Textarea name="stepsToReproduce" required minLength={8} rows={4} placeholder="Use datos de prueba, nunca datos reales de una persona." />
        </Campo>
      ) : null}
      {elegido?.extra === "canal" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Campo etiqueta="Canal">
            <Input name="channels" required minLength={2} aria-label="Canal" placeholder="Instagram, sitio web, WhatsApp…" />
          </Campo>
          <Campo etiqueta="Fecha de publicación">
            <Input name="publishAt" type="datetime-local" lang="es-CO" required aria-label="Fecha de publicación" />
          </Campo>
        </div>
      ) : null}
      {team === "DESARROLLO" ? (
        <Campo etiqueta="Módulo o sistema (opcional)">
          <Input name="moduleName" placeholder="CRM, sitio web, aula virtual…" />
        </Campo>
      ) : null}
      <Campo etiqueta="Archivo (opcional, máx. 25 MB)">
        <SelectorArchivo name="archivo" />
      </Campo>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={declares} onCheckedChange={(value) => setDeclares(value === true)} />
        <span>Confirmo que este requerimiento no contiene datos personales sensibles.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={reviewed} onCheckedChange={(value) => setReviewed(value === true)} />
        <span>Si el sistema detecta algo parecido a una cédula o un celular, confirmo que ya lo revisé.</span>
      </label>
      <p className="text-sm text-muted-foreground">Se radica desde {area}. La prioridad sugerida no define el SLA: el líder puede ajustarla.</p>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
      <div>
        <Button type="submit" size="lg" disabled={pending || !typeId || !declares}>{pending ? "Enviando…" : "Enviar"}</Button>
      </div>
      <p className="sr-only">{PRIORITY_LABEL.MEDIA}</p>
    </form>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{etiqueta}</Label>
      {children}
    </div>
  )
}
