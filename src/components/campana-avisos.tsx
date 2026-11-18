"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BellIcon } from "lucide-react"

type Aviso = {
  id: string
  subject: string
  body: string
  readAt: string | null
  href: string | null
  createdAt: string
}

export function CampanaAvisos({ inicial }: { inicial: number }) {
  const router = useRouter()
  const [abierta, setAbierta] = useState(false)
  const [unread, setUnread] = useState(inicial)
  const [items, setItems] = useState<Aviso[]>([])

  useEffect(() => { setUnread(inicial) }, [inicial])

  useEffect(() => {
    let vivo = true
    async function cargar() {
      try {
        const respuesta = await fetch("/api/avisos", { cache: "no-store" })
        if (!respuesta.ok) return
        const data = await respuesta.json() as { unread: number; items: Aviso[] }
        if (!vivo) return
        setUnread(data.unread)
        setItems(data.items)
      } catch {
        // El siguiente ciclo vuelve a intentar.
      }
    }
    const id = window.setInterval(cargar, 15000)
    return () => {
      vivo = false
      window.clearInterval(id)
    }
  }, [])

  async function cargarAhora() {
    const respuesta = await fetch("/api/avisos", { cache: "no-store" })
    if (!respuesta.ok) return
    const data = await respuesta.json() as { unread: number; items: Aviso[] }
    setUnread(data.unread)
    setItems(data.items)
  }

  async function marcar(id?: string) {
    const respuesta = await fetch("/api/avisos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : { todos: true }),
    })
    if (!respuesta.ok) return
    const data = await respuesta.json() as { unread: number }
    setUnread(data.unread)
    setItems((prev) => prev.map((item) => (!id || item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)))
  }

  async function abrir(item: Aviso) {
    if (!item.readAt) await marcar(item.id)
    setAbierta(false)
    if (item.href) router.push(item.href)
    else router.push("/notificaciones")
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label={unread ? `Avisos, ${unread} sin leer` : "Avisos"}
        aria-expanded={abierta}
        aria-haspopup="dialog"
        onClick={() => {
          setAbierta((valor) => !valor)
          void cargarAhora()
        }}
      >
        <BellIcon className="size-4" />
        {unread > 0 ? <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-[#1658B0] px-1 text-center text-[10px] font-semibold text-white">{unread}</span> : null}
      </button>
      {abierta ? (
        <div role="dialog" aria-label="Avisos" className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-[#E4E7EC] bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{unread === 0 ? "Sin avisos nuevos" : `${unread} sin leer`}</p>
            {unread > 0 ? (
              <button type="button" className="text-xs font-medium text-[#1658B0] hover:underline" onClick={() => void marcar()}>Marcar todo como leído</button>
            ) : null}
          </div>
          {items.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Cuando le asignen trabajo, el aviso aparece aquí.</p> : (
            <ul className="grid max-h-80 gap-1 overflow-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => void abrir(item)} className={item.readAt ? "w-full rounded-lg px-2 py-2 text-left text-sm opacity-70 hover:bg-[#F4F7FC]" : "w-full rounded-lg bg-[#F4F8FE] px-2 py-2 text-left text-sm hover:bg-[#E7F0FB]"}>
                    <span className="block font-medium">{item.subject}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <a href="/notificaciones" className="mt-2 block text-center text-xs font-medium text-[#1658B0] hover:underline">Ver todos</a>
        </div>
      ) : null}
    </div>
  )
}
