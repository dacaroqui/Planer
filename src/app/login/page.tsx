import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, modoAuth } from "@/auth"
import { entrarComo, entrarConClave, entrarConMicrosoft, solicitarRestablecimientoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROLE_LABEL, type RoleName } from "@/lib/domain"
import { registroPublicoHabilitado } from "@/lib/cuentas"
import { correoSmtpActivo } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const ERRORES: Record<string, string> = {
  AccessDenied: "Esa cuenta no puede entrar. Debe estar activa y aprobada.",
  Configuration: "El ingreso no está configurado.",
  CredentialsSignin: "Correo o contraseña incorrectos.",
  credenciales: "Correo o contraseña incorrectos.",
  bloqueado: "Demasiados intentos. La cuenta queda bloqueada 15 minutos.",
  inactivo: "La cuenta está inactiva. Pida al administrador que la reactive.",
  pendiente: "La cuenta está pendiente de aprobación.",
  restablecida: "Contraseña actualizada. Ya puede ingresar.",
  enviado: "Si el correo está registrado, enviamos un enlace para restablecer la contraseña.",
  smtp: "El correo no está configurado. Pida el enlace al administrador.",
  OAuthSignin: "Microsoft no completó el ingreso. Intente de nuevo.",
  OAuthCallback: "Microsoft no completó el ingreso. Intente de nuevo.",
  Default: "No se pudo iniciar sesión.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>
}) {
  const session = await auth()
  if (session?.user?.email) redirect("/panel")
  const params = await searchParams
  const modo = modoAuth()
  const codigo = params.code || params.error
  const error = codigo ? ERRORES[codigo] ?? ERRORES.Default : null
  const aviso = codigo === "restablecida" || codigo === "enviado"
  const usuarios = modo.dev
    ? await prisma.user.findMany({ where: { active: true }, orderBy: [{ role: "asc" }, { name: "asc" }] })
    : []

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between bg-sidebar px-8 py-10 text-sidebar-foreground md:px-14">
        <div>
          <p className="text-xs tracking-[0.22em] text-sidebar-primary">CIFES · LUVANIA</p>
          <h1 className="mt-6 max-w-xl font-heading text-5xl leading-[0.95] md:text-7xl">Mesa</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-sidebar-foreground/80">
            La mesa interna donde académica, la clínica, admisiones y el resto de la casa le piden trabajo a Desarrollo y a Marketing, y pueden ver cómo se está atendiendo.
          </p>
        </div>
        <p className="mt-10 text-sm text-sidebar-foreground/60">Solo cuentas del dominio cifes.edu.co.</p>
      </section>
      <section className="flex items-center px-6 py-10 md:px-12">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div>
            <h2 className="font-heading text-3xl">Ingresar</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use el correo y la contraseña de la mesa. Si todavía no tiene cuenta, pida una invitación al administrador.</p>
          </div>
          {error ? (
            <p className={`rounded-lg px-3 py-2 text-sm ${aviso ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{error}</p>
          ) : null}
          <form action={entrarConClave} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" size="lg">Ingresar</Button>
          </form>
          {correoSmtpActivo() ? (
            <form action={solicitarRestablecimientoAction} className="grid gap-2">
              <Label htmlFor="recuperar">Olvidó la contraseña</Label>
              <Input id="recuperar" name="email" type="email" required placeholder="Su correo" />
              <Button type="submit" variant="outline">Enviar enlace</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Si olvidó la contraseña, pida al administrador un enlace de restablecimiento.</p>
          )}
          {registroPublicoHabilitado() ? <Link href="/registro" className="text-sm underline">Solicitar una cuenta</Link> : null}
          {modo.entra ? (
            <form action={entrarConMicrosoft}>
              <Button type="submit" size="lg" className="w-full">Ingresar con Microsoft 365</Button>
            </form>
          ) : (
            null
          )}
          {modo.dev && usuarios.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Usuarios de prueba</CardTitle>
                <CardDescription>Perfiles ficticios para recorrer la mesa sin credenciales reales.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {usuarios.map((usuario) => (
                  <form key={usuario.id} action={entrarComo}>
                    <input type="hidden" name="email" value={usuario.email} />
                    <Button type="submit" variant="outline" className="h-auto w-full justify-between px-3 py-2">
                      <span className="text-left">
                        <span className="block font-medium">{usuario.name}</span>
                        <span className="block text-xs text-muted-foreground">{ROLE_LABEL[usuario.role as RoleName]}</span>
                      </span>
                      <span className="text-xs">Entrar</span>
                    </Button>
                  </form>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  )
}
