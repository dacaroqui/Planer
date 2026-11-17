"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { actualizarPerfilAction, cambiarClavePropiaAction } from "@/server/actions"
import { pistasClave } from "@/lib/clave"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PerfilFormulario({
  nombre,
  cargo,
  email,
  avatar,
}: {
  nombre: string
  cargo: string
  email: string
  avatar: string
}) {
  const [foto, setFoto] = useState(avatar)
  const [clave, setClave] = useState("")
  const [pending, start] = useTransition()
  const pistas = pistasClave(clave, email)
  return (
    <div className="grid max-w-xl gap-8">
      <form className="grid gap-3 rounded-lg border border-border bg-white p-4" onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        data.set("avatar", foto)
        start(async () => {
          const result = await actualizarPerfilAction(data)
          if (!result.ok) toast.error(result.error)
          else toast.success(result.message || "Perfil actualizado.")
        })
      }}>
        <h2 className="text-lg font-semibold">Datos</h2>
        <div className="grid gap-1">
          <Label htmlFor="correo">Correo</Label>
          <Input id="correo" value={email} readOnly aria-readonly="true" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="name" required minLength={3} defaultValue={nombre} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cargo">Cargo</Label>
          <Input id="cargo" name="cargo" defaultValue={cargo} placeholder="Opcional" />
        </div>
        <div className="flex items-center gap-3">
          {foto ? <span className="inline-block size-12 rounded-full bg-cover" style={{ backgroundImage: `url(${foto})` }} role="img" aria-label="Foto de perfil" /> : null}
          <Input type="file" accept="image/*" aria-label="Foto" onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            if (file.size > 120_000) {
              toast.error("La foto supera el tamaño permitido.")
              return
            }
            const reader = new FileReader()
            reader.onload = () => setFoto(String(reader.result || ""))
            reader.readAsDataURL(file)
          }} />
        </div>
        <Button type="submit" disabled={pending}>Guardar perfil</Button>
      </form>
      <form className="grid gap-3 rounded-lg border border-border bg-white p-4" onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        start(async () => {
          const result = await cambiarClavePropiaAction(data)
          if (!result.ok) toast.error(result.error)
          else {
            toast.success(result.message || "Contraseña actualizada.")
            setClave("")
            form.reset()
          }
        })
      }}>
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <div className="grid gap-1">
          <Label htmlFor="actual">Contraseña actual</Label>
          <Input id="actual" name="actual" type="password" required autoComplete="current-password" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="nueva">Nueva contraseña</Label>
          <Input id="nueva" name="password" type="password" required minLength={8} autoComplete="new-password" value={clave} onChange={(event) => setClave(event.target.value)} />
          <ul className="text-xs text-muted-foreground">{pistas.map((pista) => <li key={pista.texto}>{pista.ok ? "✓" : "·"} {pista.texto}</li>)}</ul>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="confirma">Confirme la contraseña</Label>
          <Input id="confirma" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>Actualizar contraseña</Button>
      </form>
    </div>
  )
}
