"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorMesa({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [aviso, setAviso] = useState<string | null>(null)
  useEffect(() => {
    const texto = `${error.message} ${error.digest ?? ""}`
    if (/Server Action|Failed to find|ChunkLoad|chunk/i.test(texto)) {
      setAviso("La mesa se actualizó en el servidor. Vamos a recargar esta vista.")
      const timer = window.setTimeout(() => window.location.reload(), 1200)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [error])
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-heading text-3xl">No se pudo cargar esta vista</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {aviso ?? "La consulta no se completó. Puede reintentar. Si acaba de publicarse una versión nueva, recargue la página."}
      </p>
      <Button className="mt-6" onClick={() => reset()}>Reintentar</Button>
    </div>
  )
}
