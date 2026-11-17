import Link from "next/link"

export const dynamic = "force-dynamic"
import { FormularioClave } from "@/components/formulario-clave"
import { registroPublicoHabilitado } from "@/lib/cuentas"
import { allowedDomains } from "@/lib/time"
import { registrarCuentaAction } from "@/server/actions"

export default function RegistroPage() {
  const activo = registroPublicoHabilitado()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-xs tracking-[0.22em] text-muted-foreground">MESA</p>
      <h1 className="mt-3 font-heading text-4xl">Registro</h1>
      {activo ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Solo correos de {allowedDomains().join(", ")}. La cuenta queda pendiente de aprobación, con rol Solicitante.
          </p>
          <div className="mt-6">
            <FormularioClave action={registrarCuentaAction} pedirNombre pedirCorreo tituloBoton="Solicitar acceso" />
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          El registro propio está desactivado. Pida al administrador una invitación por enlace.
        </p>
      )}
      <Link href="/login" className="mt-6 text-sm underline">Volver al ingreso</Link>
    </main>
  )
}
