"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { etiquetaMiga } from "@/lib/migas-etiqueta"

let nombrePendiente = ""

const NOMBRES: Record<string, string> = {
  panel: "Inicio",
  requerimientos: "Requerimientos",
  nuevo: "Radicar",
  tablero: "Tablero",
  proyectos: "Proyectos",
  planner: "Planner",
  gerencia: "Panel de gestión",
  rendimiento: "Rendimiento",
  ayuda: "Ayuda",
  "mis-solicitudes": "Mis solicitudes",
  notificaciones: "Avisos",
  cola: "Cola de entrada",
  admin: "Administración",
  usuarios: "Usuarios",
  catalogos: "Catálogos",
  flujos: "Flujos y SLA",
  espacios: "Espacios",
  paginas: "Páginas",
  formularios: "Formularios",
  adjuntos: "Adjuntos",
  calendario: "Calendario",
  lista: "Lista",
  perfil: "Mi perfil",
}

export function Migas() {
  const path = usePathname()
  const [nombre, setNombre] = useState(nombrePendiente)
  useEffect(() => {
    setNombre(nombrePendiente)
    function oir(event: Event) {
      const valor = String((event as CustomEvent<string>).detail || "")
      nombrePendiente = valor
      setNombre(valor)
    }
    window.addEventListener("mesa-miga", oir)
    return () => {
      window.removeEventListener("mesa-miga", oir)
    }
  }, [path])
  const partes = path.split("/").filter(Boolean)
  const migas = [{ href: "/panel", label: "Inicio" }]
  let acumulado = ""
  partes.forEach((parte, index) => {
    if (parte === "panel") return
    acumulado += `/${parte}`
    migas.push({ href: acumulado, label: etiquetaMiga(parte, index, partes, nombre, NOMBRES) })
  })
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

export function NombreMiga({ nombre }: { nombre: string }) {
  useEffect(() => {
    nombrePendiente = nombre
    window.dispatchEvent(new CustomEvent("mesa-miga", { detail: nombre }))
    return () => {
      nombrePendiente = ""
      window.dispatchEvent(new CustomEvent("mesa-miga", { detail: "" }))
    }
  }, [nombre])
  return null
}
