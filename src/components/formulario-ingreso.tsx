"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { entrarConClave } from "@/server/actions"

export function FormularioIngreso() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  return (
    <form
      action={entrarConClave}
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (pending) return
        setPending(true)
        setError("")
        const data = new FormData(event.currentTarget)
        void signIn("credenciales", {
          email: String(data.get("email") || ""),
          password: String(data.get("password") || ""),
          callbackUrl: "/panel",
          redirect: false,
        }).then((result) => {
          if (result?.error) {
            setPending(false)
            setError("No se pudo ingresar. Revise el correo y la contraseña.")
            return
          }
          window.location.assign(result?.url || "/panel")
        }).catch(() => {
          setPending(false)
          setError("No se pudo ingresar. Inténtelo de nuevo.")
        })
      }}
    >
      <div className="grid gap-1">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required disabled={pending} />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required disabled={pending} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</Button>
    </form>
  )
}
