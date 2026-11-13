import { redirect } from "next/navigation"
import { auth, modoAuth } from "@/auth"
import { entrarComo, entrarConMicrosoft } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ROLE_LABEL, type RoleName } from "@/lib/domain"
import { prisma } from "@/lib/prisma"

const ERRORES: Record<string, string> = {
  AccessDenied: "Esa cuenta no puede entrar. Debe ser un usuario activo de @cifes.edu.co.",
  Configuration: "El ingreso institucional no está configurado.",
  CredentialsSignin: "No encontramos ese usuario de prueba.",
  OAuthSignin: "Microsoft no completó el ingreso. Intente de nuevo.",
  OAuthCallback: "Microsoft no completó el ingreso. Intente de nuevo.",
  Default: "No se pudo iniciar sesión.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (session?.user?.email) redirect("/panel")
  const params = await searchParams
  const modo = modoAuth()
  const error = params.error ? ERRORES[params.error] ?? ERRORES.Default : null
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
            <p className="mt-2 text-sm text-muted-foreground">Use la cuenta institucional. En desarrollo puede entrar con un usuario de ejemplo, sin contraseña.</p>
          </div>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
          {modo.entra ? (
            <form action={entrarConMicrosoft}>
              <Button type="submit" size="lg" className="w-full">Ingresar con Microsoft 365</Button>
            </form>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {modo.entraIncompleto
                ? "Faltan variables de Entra ID. Revise el identificador, el secreto y el tenant."
                : "El ingreso con Microsoft no está configurado en este entorno."}
            </p>
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
