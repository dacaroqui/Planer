"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function CopiarEnlace({ enlace }: { enlace: string }) {
  const [aviso, setAviso] = useState("Copiar enlace")
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void navigator.clipboard.writeText(enlace).then(() => setAviso("Copiado"))
      }}
    >
      {aviso}
    </Button>
  )
}
