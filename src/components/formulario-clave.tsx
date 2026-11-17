"use client"

import { useState, useTransition } from "react"
import type { ActionResult } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function FormularioClave({
  action,
  token,
  pedirNombre,
  pedirCorreo,
  tituloBoton,
}: {
  action: (data: FormData) => Promise<ActionResult>
  token?: string
  pedirNombre?: boolean
  pedirCorreo?: boolean
  tituloBoton: string
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      start(async () => {
        const result = await action(data)
        if (!result.ok) {
          setError(result.error)
          setMensaje(null)
          return
        }
        setError(null)
        setMensaje(result.message || "Listo.")
      })
    }}>
      {token ? <input type="hidden" name="token" value={token} /> : null}
      {pedirCorreo ? (
        <div className="grid gap-1">
          <Label htmlFor="correo">Correo</Label>
          <Input id="correo" name="email" type="email" required autoComplete="email" />
        </div>
      ) : null}
      {pedirNombre ? (
        <div className="grid gap-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="name" required minLength={3} autoComplete="name" />
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="clave">Contraseña</Label>
        <Input id="clave" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="confirma">Confirme la contraseña</Label>
        <Input id="confirma" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {mensaje ? <p className="text-sm text-emerald-800">{mensaje}</p> : null}
      <Button type="submit" disabled={pending}>{tituloBoton}</Button>
    </form>
  )
}
