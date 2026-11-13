"use client"

import { useMemo, useState, useTransition } from "react"
import { radicarAction } from "@/server/actions"
import { SelectorArchivo } from "@/components/archivo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BRAND_LABEL, PRIORITY_LABEL, TEAM_LABEL, type BrandName, type PriorityName, type TeamName } from "@/lib/domain"
import { formatDuration } from "@/lib/sla"

export type TipoOpcion = {
  id: string
  team: TeamName
  name: string
  description: string
  slaMinutes: number
  requiresApproval: boolean
}

export function FormularioRadicar({ tipos, area }: { tipos: TipoOpcion[]; area: string }) {
  const [team, setTeam] = useState<TeamName>("DESARROLLO")
  const [typeId, setTypeId] = useState("")
  const [priority, setPriority] = useState<PriorityName>("MEDIA")
  const [brand, setBrand] = useState<BrandName>("CIFES")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const visibles = useMemo(() => tipos.filter((tipo) => tipo.team === team), [tipos, team])
  const elegido = visibles.find((tipo) => tipo.id === typeId) ?? null

  function onTeam(next: TeamName) {
    setTeam(next)
    setTypeId("")
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        const data = new FormData(event.currentTarget)
        data.set("team", team)
        data.set("typeId", typeId)
        data.set("priority", priority)
        data.set("brand", brand)
        start(async () => {
          const result = await radicarAction(data)
          if (result && !result.ok) setError(result.error)
        })
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Equipo destino">
          <Select value={team} onValueChange={(value) => onTeam(value as TeamName)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TEAM_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Tipo">
          <Select value={typeId || undefined} onValueChange={setTypeId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Elija el tipo" /></SelectTrigger>
            <SelectContent>
              {visibles.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>{tipo.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Prioridad">
          <Select value={priority} onValueChange={(value) => setPriority(value as PriorityName)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo etiqueta="Marca">
          <Select value={brand} onValueChange={(value) => setBrand(value as BrandName)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(BRAND_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>
      {elegido ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {elegido.description} SLA de {formatDuration(elegido.slaMinutes)} hábiles.
          {elegido.requiresApproval ? " Este tipo pasa por aprobación del líder antes de ejecutarse." : " Este tipo no requiere aprobación previa."}
        </p>
      ) : null}
      <Campo etiqueta="Título">
        <Input name="title" required minLength={8} maxLength={140} placeholder="Qué necesita, en una frase" />
      </Campo>
      <Campo etiqueta="Descripción">
        <Textarea name="description" required minLength={20} rows={6} placeholder="Contexto, a quién afecta y desde cuándo pasa." />
      </Campo>
      <Campo etiqueta="Resultado esperado">
        <Textarea name="expectedResult" required minLength={8} rows={3} placeholder="Cómo sabremos que el requerimiento quedó resuelto." />
      </Campo>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Fecha deseada (opcional)">
          <Input name="desiredDate" type="date" />
        </Campo>
        <Campo etiqueta="Archivo (opcional, máx. 10 MB)">
          <SelectorArchivo name="archivo" />
        </Campo>
      </div>
      <p className="text-sm text-muted-foreground">Se radica a nombre de {area}. El equipo verá el estado y el historial completo.</p>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
      <div>
        <Button type="submit" size="lg" disabled={pending || !typeId}>{pending ? "Radicando…" : "Radicar requerimiento"}</Button>
      </div>
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
