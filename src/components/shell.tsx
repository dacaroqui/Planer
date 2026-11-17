import Link from "next/link"
import { Atajos } from "@/components/atajos"
import { salir } from "@/server/actions"
import { MenuMovil, Navegacion, type NavItem } from "@/components/navegacion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABEL, TEAM_LABEL, type Actor } from "@/lib/domain"

export function Shell({
  actor,
  items,
  children,
}: {
  actor: Actor
  items: NavItem[]
  children: React.ReactNode
}) {
  const team = actor.team ? TEAM_LABEL[actor.team] : null
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:border-r lg:border-sidebar-border">
        <div className="px-5 pt-6 pb-4">
          <Link href="/panel" className="block">
            <p className="font-heading text-3xl leading-none tracking-tight">Mesa</p>
            <p className="mt-2 text-xs tracking-wide text-sidebar-foreground/70">CIFES · Luvania</p>
          </Link>
        </div>
        <div className="flex-1 px-3">
          <Navegacion items={items} />
        </div>
        <div className="border-t border-sidebar-border p-4 pb-16">
          <Usuario actor={actor} team={team} inverted />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <MenuMovil items={items} />
            <div>
              <p className="font-heading text-xl leading-none">Mesa</p>
              <p className="text-[11px] text-muted-foreground">CIFES · Luvania</p>
            </div>
          </div>
          <Usuario actor={actor} team={team} />
        </header>
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pt-4 md:px-8">
          <form action="/requerimientos" className="flex-1">
            <input id="busqueda-global" name="q" aria-label="Buscar por código o título" placeholder="Buscar DES- o MKT-" className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm" />
          </form>
          <Link href="/ayuda" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm" aria-label="Ayuda">?</Link>
        </div>
        <Atajos />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-muted-foreground md:px-8">
          Los datos de los usuarios internos (nombre, correo y área) se usan solo para operar esta mesa, según la política de tratamiento de datos de CIFES y Luvania. No registre datos de estudiantes, deudores, pacientes ni socios.
        </footer>
      </div>
    </div>
  )
}

function Usuario({ actor, team, inverted = false }: { actor: Actor; team: string | null; inverted?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={inverted
          ? "w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-accent"
          : "rounded-lg px-2 py-1 text-left text-sm hover:bg-muted"}
      >
        <span className="block font-medium">{actor.name}</span>
        <span className={inverted ? "block text-xs text-sidebar-foreground/70" : "block text-xs text-muted-foreground"}>
          {ROLE_LABEL[actor.role]}{!actor.isAdmin && team ? ` · ${team}` : ""}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm">{actor.name}</span>
          <span className="block text-xs text-muted-foreground">{actor.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={salir} className="w-full">
            <button type="submit" className="w-full text-left">Cerrar sesión</button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
