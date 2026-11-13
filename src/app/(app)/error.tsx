"use client"

import { Button } from "@/components/ui/button"

export default function ErrorMesa({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-heading text-3xl">No se pudo cargar esta vista</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        La mesa encontró un problema al consultar la información. Intente de nuevo. Si sigue pasando, avise a Tecnología.
      </p>
      <Button className="mt-6" onClick={() => reset()}>Reintentar</Button>
    </div>
  )
}
