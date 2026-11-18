"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { construirMigas, padreDeMigas } from "@/lib/migas-construir"
import { leerNombreMiga, escribirNombreMiga } from "@/lib/nombre-miga"
import { CLAVE_HISTORIAL, decidirVolver, registrarHistorial } from "@/lib/volver"

export function PageHeader({ inicio = "/panel" }: { inicio?: string }) {
  const path = usePathname()
  const router = useRouter()
  const [nombre, setNombre] = useState(leerNombreMiga)
  const [pila, setPila] = useState<string[]>([])

  useEffect(() => {
    setNombre(leerNombreMiga())
    function oir(event: Event) {
      const valor = String((event as CustomEvent<string>).detail || "")
      escribirNombreMiga(valor)
      setNombre(valor)
    }
    window.addEventListener("mesa-miga", oir)
    return () => window.removeEventListener("mesa-miga", oir)
  }, [path])

  useEffect(() => {
    const guardada = leerHistorial()
    const siguiente = registrarHistorial(guardada, path)
    sessionStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(siguiente))
    setPila(siguiente)
  }, [path])

  const migas = construirMigas(path, nombre)
  const padre = padreDeMigas(migas, inicio)

  function volver() {
    const decision = decidirVolver(pila, path, padre)
    if (decision.modo === "atras") {
      sessionStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(decision.pila))
      router.back()
      return
    }
    router.push(decision.href)
  }

  return (
    <div className="mb-2 flex items-center gap-1 pt-3">
      <button type="button" aria-label="Volver" onClick={volver} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#15122A] hover:bg-[#E7F0FB]">
        <ArrowLeftIcon className="size-4" aria-hidden />
      </button>
      <nav aria-label="Miga de pan" className="min-w-0 text-sm text-muted-foreground">
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
    </div>
  )
}

function leerHistorial() {
  try {
    const valor = JSON.parse(sessionStorage.getItem(CLAVE_HISTORIAL) || "[]")
    return Array.isArray(valor) ? valor.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}
