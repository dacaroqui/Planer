import Link from "next/link"

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.2em] text-muted-foreground">MESA</p>
      <h1 className="mt-3 font-heading text-4xl">No encontramos esa página</h1>
      <p className="mt-3 text-sm text-muted-foreground">El requerimiento o la ruta no existe, o ya no está disponible.</p>
      <Link href="/panel" className="mt-6 text-sm font-medium underline">Volver al panel</Link>
    </main>
  )
}
