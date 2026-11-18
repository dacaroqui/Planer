"use client"

import { useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { escribirNombreMiga } from "@/lib/nombre-miga"

export function Migas() {
  return <PageHeader />
}

export function NombreMiga({ nombre }: { nombre: string }) {
  useEffect(() => {
    escribirNombreMiga(nombre)
    window.dispatchEvent(new CustomEvent("mesa-miga", { detail: nombre }))
    return () => {
      escribirNombreMiga("")
      window.dispatchEvent(new CustomEvent("mesa-miga", { detail: "" }))
    }
  }, [nombre])
  return null
}
