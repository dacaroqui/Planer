"use client"

import { useState, useTransition } from "react"
import { vigilarSlasAction } from "@/server/actions"
import { Button } from "@/components/ui/button"

export function BotonSla() {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const result = await vigilarSlasAction()
            setMessage(result.ok ? result.message ?? "Listo." : result.error)
          })
        }}
      >
        {pending ? "Revisando…" : "Revisar SLA y avisar"}
      </Button>
      {message ? <p className="mt-2 max-w-xs text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
