import Link from "next/link"
import { FormularioClave } from "@/components/formulario-clave"
import { restablecerClaveAction } from "@/server/actions"
import { leerRestablecimiento } from "@/server/cuentas"

export default async function RestablecerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cuenta = await leerRestablecimiento(token)
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-xs tracking-[0.22em] text-muted-foreground">MESA</p>
      <h1 className="mt-3 font-heading text-4xl">Nueva contraseña</h1>
      {cuenta ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">Cuenta {cuenta.email}. El enlace vence a las 24 horas y solo sirve una vez.</p>
          <div className="mt-6">
            <FormularioClave action={restablecerClaveAction} token={token} tituloBoton="Guardar contraseña" />
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Este enlace no es válido, ya se usó o venció. Pida otro al administrador.</p>
      )}
      <Link href="/login" className="mt-6 text-sm underline">Volver al ingreso</Link>
    </main>
  )
}
