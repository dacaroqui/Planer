import Link from "next/link"
import { puedeAdministrar } from "@/lib/permissions"
import { requireActor } from "@/server/session"

const ENLACES = [
  { href: "/admin/usuarios", titulo: "Usuarios", texto: "Invitaciones, roles y restablecer contraseña." },
  { href: "/admin/catalogos", titulo: "Catálogos", texto: "Empresas, áreas, tipos y marcas." },
  { href: "/admin/flujos", titulo: "Flujos y SLA", texto: "Estados, transiciones y tiempos de respuesta." },
]

export default async function AdminPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Administración</h1>
        <p className="mt-3 text-sm text-muted-foreground">Esta sección es solo para el administrador.</p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Administración</h1>
        <p className="mt-2 text-sm text-muted-foreground">Usuarios, catálogos y flujos. Elija una sección.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {ENLACES.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block h-full rounded-xl border border-border bg-card p-4 hover:bg-muted">
              <span className="font-medium">{item.titulo}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{item.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
