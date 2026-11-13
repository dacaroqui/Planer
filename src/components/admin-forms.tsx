"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { actualizarTipoAction, actualizarUsuarioAction, crearAreaAction, crearTipoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROLE_LABEL, ROLES, TEAM_LABEL, type RoleName, type TeamName } from "@/lib/domain"

export function EditorUsuario({
  user,
  areas,
}: {
  user: { id: string; name: string; email: string; role: RoleName; team: TeamName | null; areaId: string; active: boolean }
  areas: { id: string; name: string }[]
}) {
  const [role, setRole] = useState<RoleName>(user.role)
  const [team, setTeam] = useState(user.team ?? "NINGUNO")
  const [areaId, setAreaId] = useState(user.areaId)
  const [active, setActive] = useState(user.active)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const pideEquipo = role === "AGENTE" || role === "LIDER"

  return (
    <form
      className="grid gap-2 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData()
        data.set("userId", user.id)
        data.set("role", role)
        data.set("team", pideEquipo ? team : "")
        data.set("areaId", areaId)
        data.set("active", active ? "1" : "0")
        start(async () => {
          const result = await actualizarUsuarioAction(data)
          if (!result.ok) setError(result.error)
          else {
            setError(null)
            toast.success(result.message || "Usuario actualizado.")
          }
        })
      }}
    >
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={role} onValueChange={(value) => setRole(value as RoleName)}>
          <SelectTrigger className="w-full" aria-label="Rol"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((item) => <SelectItem key={item} value={item}>{ROLE_LABEL[item]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={team} onValueChange={setTeam} disabled={!pideEquipo}>
          <SelectTrigger className="w-full" aria-label="Equipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NINGUNO">Sin equipo</SelectItem>
            {Object.entries(TEAM_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={areaId} onValueChange={setAreaId}>
          <SelectTrigger className="w-full" aria-label="Área"><SelectValue /></SelectTrigger>
          <SelectContent>
            {areas.map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(value) => setActive(value === true)} />
        Usuario activo
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" size="sm" disabled={pending}>Guardar</Button></div>
    </form>
  )
}

export function FormularioArea() {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        start(async () => {
          const result = await crearAreaAction(data)
          if (!result.ok) setError(result.error)
          else {
            setError(null)
            toast.success("Área creada.")
            event.currentTarget.reset()
          }
        })
      }}
    >
      <Input name="name" placeholder="Nombre del área" required minLength={3} />
      <Button type="submit" disabled={pending}>Agregar área</Button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  )
}

export function FormularioTipo() {
  const [team, setTeam] = useState<TeamName>("DESARROLLO")
  const [approval, setApproval] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        data.set("team", team)
        data.set("requiresApproval", approval ? "1" : "0")
        start(async () => {
          const result = await crearTipoAction(data)
          if (!result.ok) setError(result.error)
          else {
            setError(null)
            toast.success("Tipo creado.")
            event.currentTarget.reset()
          }
        })
      }}
    >
      <div className="grid gap-2 md:grid-cols-2">
        <Select value={team} onValueChange={(value) => setTeam(value as TeamName)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TEAM_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input name="name" placeholder="Nombre del tipo" required minLength={3} />
        <Input name="slaHours" type="number" min={1} max={400} step={1} placeholder="Horas hábiles de SLA" required />
        <Input name="description" placeholder="Cuándo se usa este tipo" required minLength={8} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={approval} onCheckedChange={(value) => setApproval(value === true)} />
        Requiere aprobación del líder
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" disabled={pending}>Crear tipo</Button></div>
    </form>
  )
}

export function EditorTipo({
  tipo,
}: {
  tipo: { id: string; name: string; team: TeamName; description: string; slaMinutes: number; requiresApproval: boolean; active: boolean }
}) {
  const [approval, setApproval] = useState(tipo.requiresApproval)
  const [active, setActive] = useState(tipo.active)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="grid gap-2 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        data.set("id", tipo.id)
        data.set("requiresApproval", approval ? "1" : "0")
        data.set("active", active ? "1" : "0")
        start(async () => {
          const result = await actualizarTipoAction(data)
          if (!result.ok) setError(result.error)
          else {
            setError(null)
            toast.success("Tipo actualizado.")
          }
        })
      }}
    >
      <p className="font-medium">{tipo.name} · {TEAM_LABEL[tipo.team]}</p>
      <Label htmlFor={`desc-${tipo.id}`}>Descripción</Label>
      <Input id={`desc-${tipo.id}`} name="description" defaultValue={tipo.description} required minLength={8} />
      <Label htmlFor={`sla-${tipo.id}`}>Horas hábiles</Label>
      <Input id={`sla-${tipo.id}`} name="slaHours" type="number" min={1} max={400} defaultValue={tipo.slaMinutes / 60} required />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={approval} onCheckedChange={(value) => setApproval(value === true)} />
        Requiere aprobación
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(value) => setActive(value === true)} />
        Activo
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" size="sm" disabled={pending}>Guardar tipo</Button></div>
    </form>
  )
}
