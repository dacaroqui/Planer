"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { aceptarInvitacionAction } from "@/server/actions"
import { pistasClave } from "@/lib/clave"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"

export function FormularioInvitacionAceptar({
  token,
  email,
  rol,
  area,
}: {
  token: string
  email: string
  rol: string
  area: string
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const pistas = pistasClave(password, email)
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (pending) return
        const data = new FormData(event.currentTarget)
        setPending(true)
        setError(null)
        void aceptarInvitacionAction(data).then(async (result) => {
          if (!result.ok) {
            setPending(false)
            setError(result.error)
            return
          }
          const ingreso = await signIn("credenciales", {
            email,
            password: String(data.get("password") || ""),
            callbackUrl: "/panel",
            redirect: false,
          })
          if (ingreso?.error) {
            window.location.assign("/login?code=credenciales")
            return
          }
          window.location.assign("/panel")
        }).catch(() => {
          setPending(false)
          setError("No se pudo crear la cuenta. Inténtelo de nuevo.")
        })
      }}
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="avatar" id="avatar-valor" value="" />
      <div className="grid gap-1">
        <Label htmlFor="correo-inv">Correo</Label>
        <Input id="correo-inv" value={email} readOnly aria-readonly="true" />
      </div>
      <p className="text-sm text-muted-foreground">Rol: {rol}. Área: {area || "la del enlace"}.</p>
      <div className="grid gap-1">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="name" required minLength={3} autoComplete="name" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="cargo">Cargo</Label>
        <Input id="cargo" name="cargo" autoComplete="organization-title" placeholder="Opcional" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="clave">Contraseña</Label>
        <PasswordInput id="clave" name="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <ul className="text-xs text-muted-foreground">
          {pistas.map((pista) => <li key={pista.texto}>{pista.ok ? "✓" : "·"} {pista.texto}</li>)}
        </ul>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="confirma">Confirme la contraseña</Label>
        <PasswordInput id="confirma" name="confirm" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="foto">Foto</Label>
        <Input id="foto" type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0]
          const destino = document.getElementById("avatar-valor") as HTMLInputElement | null
          if (!file || !destino) return
          if (file.size > 120_000) {
            setError("La foto supera el tamaño permitido.")
            event.target.value = ""
            destino.value = ""
            return
          }
          const reader = new FileReader()
          reader.onload = () => { destino.value = String(reader.result || "") }
          reader.readAsDataURL(file)
        }} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="politica" value="1" required className="mt-1" />
        <span>Acepto que mis datos (nombre, correo, cargo y foto) se usen solo para operar Planer, según la política de CIFES y Luvania.</span>
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Creando…" : "Crear mi cuenta"}</Button>
    </form>
  )
}
