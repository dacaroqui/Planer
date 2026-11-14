"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  EyeIcon,
  InboxIcon,
  Columns3Icon,
  LayoutDashboardIcon,
  ListIcon,
  MenuIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const ICONS = {
  panel: LayoutDashboardIcon,
  planner: Columns3Icon,
  lista: ListIcon,
  radicar: PlusIcon,
  bandeja: InboxIcon,
  gerencia: EyeIcon,
  avisos: BellIcon,
  usuarios: UsersIcon,
  catalogos: SettingsIcon,
} as const

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number }

function Enlaces({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const active = pathname === item.href || (item.href !== "/panel" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4" />
              {item.label}
            </span>
            {item.badge ? (
              <span className="rounded-full bg-sidebar-primary px-1.5 text-[11px] font-semibold text-sidebar-primary-foreground">
                {item.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function Navegacion({ items }: { items: NavItem[] }) {
  return <Enlaces items={items} />
}

export function MenuMovil({ items }: { items: NavItem[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Abrir menú">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
        <SheetHeader>
          <SheetTitle className="font-heading text-sidebar-foreground">Mesa</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <Enlaces items={items} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
