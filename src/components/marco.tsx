"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  PanelLeftIcon,
  PlusIcon,
  StarIcon,
  ClockIcon,
  FilterIcon,
  HomeIcon,
} from "lucide-react"
import { Atajos, BotonAtajos } from "@/components/atajos"
import { Migas } from "@/components/migas"
import { salir } from "@/server/actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABEL, type Actor } from "@/lib/domain"
import { cn } from "@/lib/utils"

export type EspacioNav = { id: string; name: string }

export function Marco({
  actor,
  espacios,
  unread,
  puedeAdmin,
  puedeRadicar,
  puedePlanner,
  puedeCola,
  puedeTablero,
  children,
}: {
  actor: Actor
  espacios: EspacioNav[]
  unread: number
  puedeAdmin: boolean
  puedeRadicar: boolean
  puedePlanner: boolean
  puedeCola: boolean
  puedeTablero: boolean
  children: React.ReactNode
}) {
  const path = usePathname()
  const inicio = actor.role === "SOLICITANTE" ? "/mis-solicitudes" : "/panel"
  const [abierta, setAbierta] = useState(true)
  const [recientes, setRecientes] = useState<EspacioNav[]>([])
  const [espaciosAbiertos, setEspaciosAbiertos] = useState(true)
  useEffect(() => {
    setAbierta(localStorage.getItem("planer-sidebar") !== "cerrada")
    try {
      setRecientes(JSON.parse(localStorage.getItem("planer-recientes") || "[]"))
    } catch {
      setRecientes([])
    }
  }, [])
  function alternar() {
    setAbierta((valor) => {
      localStorage.setItem("planer-sidebar", valor ? "cerrada" : "abierta")
      return !valor
    })
  }
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid" style={{ gridTemplateColumns: abierta ? "248px 1fr" : "64px 1fr" }}>
      <aside className={cn("hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col", abierta ? "px-3" : "px-2")}>
        <div className="flex items-center justify-between py-4">
          {abierta ? (
            <Link href={inicio} className="px-2">
              <p className="text-lg font-semibold leading-none text-[#1658B0]">Planer</p>
              <p className="mt-1 text-[11px] text-muted-foreground">CIFES · Luvania</p>
            </Link>
          ) : <span className="sr-only">Planer</span>}
          <button type="button" onClick={alternar} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent" aria-label={abierta ? "Contraer menú" : "Expandir menú"}>
            <PanelLeftIcon className="size-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pb-6 text-sm" aria-label="Principal">
          {actor.role === "SOLICITANTE" ? null : <Enlace href="/panel" activo={path === "/panel"} etiqueta="Para ti" icono={<HomeIcon className="size-4" />} compacta={!abierta} />}
          <Recientes items={recientes} compacta={!abierta} destino={inicio} />
          {actor.role === "SOLICITANTE" ? null : <Enlace href="/panel?tab=marcado" activo={path === "/panel"} etiqueta="Marcados como favoritos" icono={<StarIcon className="size-4" />} compacta={!abierta} />}
          <div className="mt-3">
            <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent" onClick={() => setEspaciosAbiertos((v) => !v)} aria-expanded={espaciosAbiertos}>
              <ChevronDownIcon className={cn("size-3", espaciosAbiertos ? "" : "-rotate-90")} />
              {abierta ? "Espacios" : <span className="sr-only">Espacios</span>}
            </button>
            {espaciosAbiertos && abierta ? (
              <div className="mt-1 grid gap-0.5">
                {espacios.length === 0 ? <p className="px-2 text-xs text-muted-foreground">Todavía no hay espacios.</p> : espacios.map((espacio) => (
                  <div key={espacio.id}>
                    <Link href={`/espacios/${espacio.id}`} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent", path.startsWith(`/espacios/${espacio.id}`) && "bg-sidebar-accent font-medium text-[#1658B0]")}>
                      <span className="inline-flex size-5 items-center justify-center rounded text-[10px] font-semibold text-white" style={{ background: espacio.name.toLowerCase().includes("luvania") ? "#EE876B" : "#1658B0" }}>{espacio.name.slice(0, 1)}</span>
                      <span className="truncate">{espacio.name}</span>
                    </Link>
                    <Link href={`/espacios/${espacio.id}`} className="block px-9 py-0.5 text-xs text-muted-foreground hover:underline">Recientes</Link>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <Enlace href="/requerimientos" activo={path.startsWith("/requerimientos") && !path.endsWith("/nuevo")} etiqueta="Filtros" icono={<FilterIcon className="size-4" />} compacta={!abierta} />
          {puedeTablero ? <Enlace href="/gerencia" activo={path.startsWith("/gerencia") || path.startsWith("/paneles")} etiqueta="Paneles" icono={<LayoutDashboardIcon className="size-4" />} compacta={!abierta} /> : null}
          {puedePlanner ? <Enlace href="/planner" activo={path.startsWith("/planner")} etiqueta="Planner" icono={<LayoutDashboardIcon className="size-4" />} compacta={!abierta} /> : null}
          <Enlace href="/mis-solicitudes" activo={path.startsWith("/mis-solicitudes")} etiqueta="Mis solicitudes" icono={<ClockIcon className="size-4" />} compacta={!abierta} />
          {puedeCola ? <Enlace href="/cola" activo={path.startsWith("/cola")} etiqueta="Cola de entrada" icono={<FilterIcon className="size-4" />} compacta={!abierta} /> : null}
          {puedeTablero ? <Enlace href="/tablero" activo={path.startsWith("/tablero")} etiqueta="Tablero" icono={<LayoutDashboardIcon className="size-4" />} compacta={!abierta} /> : null}
          {puedeAdmin ? (
            <div className="mt-4 border-t border-sidebar-border pt-3">
              {abierta ? <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administración</p> : null}
              <Enlace href="/admin/usuarios" activo={path.startsWith("/admin/usuarios")} etiqueta="Usuarios" icono={<span className="size-4" />} compacta={!abierta} />
              <Enlace href="/admin/catalogos" activo={path.startsWith("/admin/catalogos")} etiqueta="Catálogos" icono={<span className="size-4" />} compacta={!abierta} />
              <Enlace href="/admin/flujos" activo={path.startsWith("/admin/flujos")} etiqueta="Flujos y SLA" icono={<span className="size-4" />} compacta={!abierta} />
            </div>
          ) : null}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white px-3 py-2">
          <Link href={inicio} className="text-sm font-semibold text-[#1658B0] lg:hidden">Planer</Link>
          <form action="/requerimientos" className="mx-auto w-full max-w-xl">
            <input id="busqueda-global" name="q" aria-label="Buscar por código o título" placeholder="Buscar" className="h-9 w-full rounded-md border border-input bg-[#F4F7FC] px-3 text-sm" />
          </form>
          {puedeRadicar || puedePlanner ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1 rounded-md bg-[#1658B0] px-3 text-sm font-medium text-white hover:bg-[#222B7C]">
                <PlusIcon className="size-4" /> Crear
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {puedeRadicar ? <DropdownMenuItem asChild><Link href="/requerimientos/nuevo">Requerimiento</Link></DropdownMenuItem> : null}
                {puedePlanner ? <DropdownMenuItem asChild><Link href="/planner">Tarea en Planner</Link></DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Link href="/notificaciones" className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted" aria-label={unread ? `Avisos, ${unread} sin leer` : "Avisos"}>
            <BellIcon className="size-4" />
            {unread > 0 ? <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-[#1658B0] px-1 text-center text-[10px] font-semibold text-white">{unread}</span> : null}
          </Link>
          <BotonAtajos />
          <Link href="/ayuda" className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted" aria-label="Ayuda"><HelpCircleIcon className="size-4" /></Link>
          <Usuario actor={actor} />
        </header>
        <Migas />
        <Atajos />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  )
}

function Enlace({ href, etiqueta, icono, activo, compacta }: { href: string; etiqueta: string; icono: React.ReactNode; activo: boolean; compacta: boolean }) {
  return (
    <Link href={href} title={etiqueta} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent", activo && "bg-sidebar-accent font-medium text-[#1658B0]")}>
      {icono}
      {compacta ? <span className="sr-only">{etiqueta}</span> : <span className="truncate">{etiqueta}</span>}
    </Link>
  )
}

function Recientes({ items, compacta, destino }: { items: EspacioNav[]; compacta: boolean; destino: string }) {
  if (compacta) return <Enlace href={destino} activo={false} etiqueta="Recientes" icono={<ClockIcon className="size-4" />} compacta />
  return (
    <div>
      <p className="flex items-center gap-2 px-2 py-1.5 text-sm"><ClockIcon className="size-4" /> Recientes</p>
      {items.slice(0, 4).map((item) => (
        <Link key={item.id} href={`/espacios/${item.id}`} className="block truncate px-8 py-0.5 text-xs text-muted-foreground hover:underline">{item.name}</Link>
      ))}
    </div>
  )
}

function Usuario({ actor }: { actor: Actor }) {
  const letras = actor.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-full bg-[#222B7C] text-xs font-semibold text-white" aria-label={`Cuenta de ${actor.name}`}>
        {letras || "P"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm">{actor.name}</span>
          <span className="block text-xs text-muted-foreground">{actor.email}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABEL[actor.role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">Mi perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <form action={salir} className="w-full">
            <button type="submit" className="w-full text-left">Cerrar sesión</button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
