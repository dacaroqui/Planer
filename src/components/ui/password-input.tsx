"use client"

import { useState, type ComponentProps } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"

export function etiquetaVisibilidad(visible: boolean) {
  return visible ? "Ocultar contraseña" : "Mostrar contraseña"
}

export function PasswordInput({ className, disabled, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={etiquetaVisibilidad(visible)}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        onClick={() => setVisible((valor) => !valor)}
      >
        {visible ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
