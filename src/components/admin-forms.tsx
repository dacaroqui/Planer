"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { BotonRestablecer } from "@/components/acceso-admin"
import { actualizarTipoAction, actualizarUsuarioAction, crearAreaAction, crearTipoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TEAM_LABEL, type TeamName } from "@/lib/domain"

const ROLES_AREA = ["AGENTE", "LIDER", "OBSERVADOR"] as const

export function EditorUsuario({
  user,
  areas,
  empresas,
}: {
  user: {
    id: string
    name: string
    email: string
    areaId: string
    active: boolean
    pendiente: boolean
    isAdmin: boolean
    empresaIds: string[]
    areaIds: string[]
    memberships: { team: TeamName; role: "AGENTE" | "LIDER" | "OBSERVADOR" }[]
  }
  areas: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
}) {
  const [areaId, setAreaId] = useState(user.areaId)
  const [active, setActive] = useState(user.active)
  const [pendiente, setPendiente] = useState(user.pendiente)
  const [isAdmin, setIsAdmin] = useState(user.isAdmin)
  const [empresaIds, setEmpresaIds] = useState<string[]>(user.empresaIds)
  const [areaIds, setAreaIds] = useState<string[]>(user.areaIds)
  const [marks, setMarks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const item of user.memberships) initial[`${item.role}:${item.team}`] = true
    return initial
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      className="grid gap-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData()
        data.set("userId", user.id)
        data.set("areaId", areaId)
        data.set("active", active ? "1" : "0")
        data.set("pendiente", pendiente ? "1" : "0")
        data.set("isAdmin", isAdmin ? "1" : "0")
        for (const id of empresaIds) data.append("empresaIds", id)
        for (const id of areaIds) data.append("areaIds", id)
        for (const [key, value] of Object.entries(marks)) if (value) data.set(key, "1")
        start(async () => {
          const result = await actualizarUsuarioAction(data)
          if (!result.ok) setError(result.error)
          else {
            setError(null)
            toast.success(result.message || "Roles actualizados.")
          }
        })
      }}
    >
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}{user.pendiente ? " · Pendiente de aprobación" : ""}</p>
      </div>
      <Select value={areaId} onValueChange={setAreaId}>
        <SelectTrigger className="w-full" aria-label="Área del perfil"><SelectValue /></SelectTrigger>
        <SelectContent>
          {areas.map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["DESARROLLO", "MARKETING"] as const).map((team) => (
          <fieldset key={team} className="grid gap-1 rounded-lg border border-border p-2">
            <legend className="px-1 text-xs">{TEAM_LABEL[team]}</legend>
            {ROLES_AREA.map((role) => {
              const key = `${role}:${team}`
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={Boolean(marks[key])} onCheckedChange={(value) => setMarks((prev) => ({ ...prev, [key]: value === true }))} />
                  {role === "AGENTE" ? "Agente" : role === "LIDER" ? "Líder" : "Observador"}
                </label>
              )
            })}
          </fieldset>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={isAdmin} onCheckedChange={(value) => setIsAdmin(value === true)} />Administrador</label>
      <fieldset className="grid gap-1">
        <legend className="text-xs text-muted-foreground">Empresas</legend>
        {empresas.map((empresa) => (
          <label key={empresa.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={empresaIds.includes(empresa.id)} onCheckedChange={(value) => setEmpresaIds((prev) => value === true ? [...prev, empresa.id] : prev.filter((id) => id !== empresa.id))} />
            {empresa.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-1">
        <legend className="text-xs text-muted-foreground">Áreas adicionales</legend>
        {areas.map((area) => (
          <label key={area.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={areaIds.includes(area.id)} onCheckedChange={(value) => setAreaIds((prev) => value === true ? [...prev, area.id] : prev.filter((id) => id !== area.id))} />
            {area.name}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={pendiente} onCheckedChange={(value) => setPendiente(value === true)} />Pendiente de aprobación</label>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={active} onCheckedChange={(value) => setActive(value === true)} />Usuario activo</label>
      <BotonRestablecer userId={user.id} />
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" size="sm" disabled={pending}>Guardar roles</Button></div>
    </form>
  )
}

export function FormularioArea() {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        const result = await crearAreaAction(data)
        if (!result.ok) setError(result.error)
        else { setError(null); toast.success("Área creada."); event.currentTarget.reset() }
      })
    }}>
      <Input name="name" placeholder="Nombre del área" required minLength={3} />
      <Button type="submit" disabled={pending}>Agregar área</Button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  )
}

export function FormularioTipo() {
  const [team, setTeam] = useState<TeamName>("DESARROLLO")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("team", team)
      start(async () => {
        const result = await crearTipoAction(data)
        if (!result.ok) setError(result.error)
        else { setError(null); toast.success("Tipo creado."); event.currentTarget.reset() }
      })
    }}>
      <div className="grid gap-2 md:grid-cols-2">
        <Select value={team} onValueChange={(value) => setTeam(value as TeamName)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TEAM_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input name="name" placeholder="Nombre del tipo" required minLength={3} />
        <Input name="description" placeholder="Cuándo se usa" required minLength={8} />
        <Input name="extra" placeholder="pasos, canal o vacío" />
      </div>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" disabled={pending}>Crear tipo</Button></div>
    </form>
  )
}

export function EditorTipo({ tipo }: { tipo: { id: string; name: string; team: TeamName; description: string; extra: string; active: boolean } }) {
  const [active, setActive] = useState(tipo.active)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form className="grid gap-2 rounded-xl border border-border bg-card p-4" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("id", tipo.id)
      data.set("active", active ? "1" : "0")
      start(async () => {
        const result = await actualizarTipoAction(data)
        if (!result.ok) setError(result.error)
        else { setError(null); toast.success("Tipo actualizado.") }
      })
    }}>
      <p className="font-medium">{tipo.name} · {TEAM_LABEL[tipo.team]}</p>
      <Label htmlFor={`desc-${tipo.id}`}>Descripción</Label>
      <Input id={`desc-${tipo.id}`} name="description" defaultValue={tipo.description} required minLength={8} />
      <Label htmlFor={`extra-${tipo.id}`}>Campo adicional (pasos o canal)</Label>
      <Input id={`extra-${tipo.id}`} name="extra" defaultValue={tipo.extra} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(value) => setActive(value === true)} />
        Activo en formularios nuevos
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" size="sm" disabled={pending}>Guardar tipo</Button></div>
    </form>
  )
}
