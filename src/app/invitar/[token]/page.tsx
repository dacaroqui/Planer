import Link from "next/link"
import { FormularioClave } from "@/components/formulario-clave"
import { aceptarInvitacionAction } from "@/server/actions"
import { leerInvitacion } from "@/server/cuentas"

export default async function InvitarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitacion = await leerInvitacion(token)
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-xs tracking-[0.22em] text-muted-foreground">MESA</p>
      <h1 className="mt-3 font-heading text-4xl">Aceptar invitación</h1>
      {invitacion ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            La invitación es para {invitacion.email}, con rol {invitacion.role}. El enlace se consume al crear la contraseña.
          </p>
          <div className="mt-6">
            <FormularioClave action={aceptarInvitacionAction} token={token} pedirNombre tituloBoton="Crear mi cuenta" />
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Este enlace no es válido, ya se usó o venció. Pida una invitación nueva al administrador.</p>
      )}
      <Link href="/login" className="mt-6 text-sm underline">Volver al ingreso</Link>
    </main>
  )
}
