"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NOMBRES: Record<string, string> = {
  panel: "Panel",
  requerimientos: "Requerimientos",
  nuevo: "Radicar",
  tablero: "Tablero",
  proyectos: "Proyectos",
  planner: "Planner",
  gerencia: "Panel de gestión",
  ayuda: "Ayuda",
  "mis-solicitudes": "Mis solicitudes",
  notificaciones: "Avisos",
  cola: "Cola de entrada",
  admin: "Administración",
  usuarios: "Usuarios",
  catalogos: "Catálogos",
  flujos: "Flujos y SLA",
}

export function Migas() {
  const path = usePathname()
  const partes = path.split("/").filter(Boolean)
  const migas = [{ href: "/panel", label: "Panel" }]
  let acumulado = ""
  for (const parte of partes) {
    if (parte === "panel") continue
    acumulado += `/${parte}`
    migas.push({ href: acumulado, label: NOMBRES[parte] ?? decodeURIComponent(parte) })
  }
  return (
    <nav aria-label="Miga de pan" className="mx-auto w-full max-w-6xl px-4 pt-4 text-sm text-muted-foreground md:px-8">
      <ol className="flex flex-wrap items-center gap-1">
        {migas.map((miga, index) => {
          const ultima = index === migas.length - 1
          return (
            <li key={miga.href} className="flex items-center gap-1">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {ultima ? <span className="text-foreground">{miga.label}</span> : <Link href={miga.href} className="underline-offset-2 hover:underline">{miga.label}</Link>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
