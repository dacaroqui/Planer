import Link from "next/link"
import { FormularioInvitacionAceptar } from "@/components/formulario-invitacion"
import { MENSAJE_ENLACE } from "@/lib/invitacion-estado"
import { ROLE_LABEL, type RoleName } from "@/lib/domain"
import { detalleInvitacion } from "@/server/cuentas"

export default async function InvitarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitacion = await detalleInvitacion(token)
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-xs tracking-[0.22em] text-[#1658B0]">PLANER</p>
      <p className="text-xs text-muted-foreground">CIFES · Luvania</p>
      <h1 className="mt-3 text-4xl font-semibold">Aceptar invitación</h1>
      {invitacion.estado === "pendiente" ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">Cree su perfil. El correo, el rol y el área vienen del enlace y no se pueden cambiar.</p>
          <div className="mt-6">
            <FormularioInvitacionAceptar
              token={token}
              email={invitacion.email}
              rol={ROLE_LABEL[invitacion.role as RoleName] ?? invitacion.role}
              area={invitacion.area}
            />
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{MENSAJE_ENLACE[invitacion.estado]}</p>
      )}
      <Link href="/login" className="mt-6 text-sm underline">Volver al ingreso</Link>
    </main>
  )
}
