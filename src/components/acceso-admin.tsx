"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { crearInvitacionAction, crearUsuarioManualAction, generarRestablecimientoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const ROLES = [
  ["SOLICITANTE", "Solicitante"],
  ["AGENTE", "Agente"],
  ["LIDER", "Líder"],
  ["OBSERVADOR", "Observador"],
  ["ADMINISTRADOR", "Administrador"],
] as const

function Enlace({ enlace }: { enlace: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
      <Label htmlFor="enlace-generado">Enlace de un solo uso</Label>
      <Input id="enlace-generado" readOnly value={enlace} onFocus={(event) => event.currentTarget.select()} />
      <Button type="button" variant="outline" onClick={async () => {
        await navigator.clipboard.writeText(enlace)
        setCopiado(true)
      }}>{copiado ? "Copiado" : "Copiar enlace"}</Button>
    </div>
  )
}

function CamposComunes({
  areas,
  empresas,
  conClave,
  conNombre,
}: {
  areas: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
  conClave?: boolean
  conNombre?: boolean
}) {
  return (
    <>
      {conNombre ? <Input name="name" placeholder="Nombre" required minLength={3} aria-label="Nombre" /> : null}
      <Input name="email" type="email" placeholder="correo@cifes.edu.co" required aria-label="Correo" />
      {conClave ? <Input name="password" type="password" placeholder="Contraseña inicial" required minLength={8} autoComplete="new-password" aria-label="Contraseña inicial" /> : null}
      <select name="rol" className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Rol" defaultValue="SOLICITANTE">
        {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select name="areaId" className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Área principal" required defaultValue={areas[0]?.id || ""}>
        {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
      </select>
      <fieldset className="grid gap-1">
        <legend className="text-xs text-muted-foreground">Otras áreas</legend>
        {areas.map((area) => (
          <label key={area.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="areaIds" value={area.id} />
            {area.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-1">
        <legend className="text-xs text-muted-foreground">Empresas</legend>
        {empresas.map((empresa) => (
          <label key={empresa.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="empresaIds" value={empresa.id} />
            {empresa.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-1">
        <legend className="text-xs text-muted-foreground">Equipo, si el rol es agente, líder u observador</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="team:DESARROLLO" value="1" />Desarrollo</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="team:MARKETING" value="1" />Marketing</label>
      </fieldset>
    </>
  )
}

export function FormularioInvitacion({
  areas,
  empresas,
}: {
  areas: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [resumen, setResumen] = useState<string | null>(null)
  const [clave, setClave] = useState(0)
  return (
    <form key={clave} className="grid gap-3 rounded-xl border border-border bg-card p-4" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        const result = await crearInvitacionAction(data)
        if (!result.ok) {
          setError(result.error)
          setEnlace(null)
          setResumen(null)
          return
        }
        setError(null)
        setEnlace(result.enlace || null)
        setResumen(result.resumen || null)
        setClave((value) => value + 1)
        toast.success(result.message || "Invitación lista.")
      })
    }}>
      <div>
        <h2 className="font-heading text-2xl">Invitar</h2>
        <p className="mt-1 text-sm text-muted-foreground">El enlace vence en 7 días y solo sirve una vez. La persona pone su nombre y su contraseña.</p>
      </div>
      <CamposComunes areas={areas} empresas={empresas} />
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {enlace ? (
        <div className="grid gap-2">
          {resumen ? <p className="text-sm">Invitación para {resumen}. El enlace es de un solo uso.</p> : null}
          <Enlace enlace={enlace} />
        </div>
      ) : null}
      <div><Button type="submit" disabled={pending}>{pending ? "Generando…" : "Generar invitación"}</Button></div>
    </form>
  )
}

export function FormularioUsuarioManual({
  areas,
  empresas,
}: {
  areas: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form className="grid gap-3 rounded-xl border border-border bg-card p-4" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        const result = await crearUsuarioManualAction(data)
        if (!result.ok) setError(result.error)
        else {
          setError(null)
          toast.success(result.message || "Usuario creado.")
          event.currentTarget.reset()
        }
      })
    }}>
      <div>
        <h2 className="font-heading text-2xl">Crear usuario</h2>
        <p className="mt-1 text-sm text-muted-foreground">Úselo cuando la persona no va a abrir una invitación. La contraseña inicial no se vuelve a mostrar.</p>
      </div>
      <CamposComunes areas={areas} empresas={empresas} conNombre conClave />
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div><Button type="submit" variant="outline" disabled={pending}>Crear usuario</Button></div>
    </form>
  )
}

export function BotonRestablecer({ userId }: { userId: string }) {
  const [pending, start] = useTransition()
  const [enlace, setEnlace] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => {
        const data = new FormData()
        data.set("userId", userId)
        start(async () => {
          const result = await generarRestablecimientoAction(data)
          if (!result.ok) setError(result.error)
          else {
            setError(null)
            setEnlace(result.enlace || null)
            toast.success(result.message || "Enlace listo.")
          }
        })
      }}>Generar enlace para restablecer</Button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {enlace ? <Enlace enlace={enlace} /> : null}
    </div>
  )
}
