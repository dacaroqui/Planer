"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDownIcon, LinkIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react"
import { toast } from "sonner"
import { FormularioUsuarioManual } from "@/components/acceso-admin"
import { EditorUsuario } from "@/components/admin-forms"
import { CopiarEnlace } from "@/components/copiar-enlace"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ROLE_LABEL, TEAM_LABEL, type RoleName, type TeamName } from "@/lib/domain"
import { Elegir, ElegirVarios } from "@/components/ui/elegir"
import { type EstadoEnlace } from "@/lib/invitacion-estado"
import { actualizarUsuarioAction, crearInvitacionAction, revocarInvitacionFormAction } from "@/server/actions"

type Usuario = {
  id: string
  name: string
  email: string
  areaId: string
  area: string
  active: boolean
  pendiente: boolean
  isAdmin: boolean
  empresaIds: string[]
  areaIds: string[]
  memberships: { team: TeamName; role: "AGENTE" | "LIDER" | "OBSERVADOR" }[]
}

type Invitacion = {
  id: string
  email: string
  role: string
  estado: EstadoEnlace
  enlace: string
}

const COLORES = ["#DBEAFE", "#FCE7F3", "#EDE9FE", "#DCFCE7", "#FEF3C7", "#E0F2FE"]
const TINTAS = ["#1D4ED8", "#BE185D", "#6D28D9", "#15803D", "#B45309", "#0369A1"]
function iniciales(nombre: string) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase() ?? "").join("") || "P"
}

function tono(nombre: string) {
  const indice = [...nombre].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % COLORES.length
  return { fondo: COLORES[indice], tinta: TINTAS[indice] }
}

function rolDe(usuario: Usuario) {
  if (usuario.isAdmin) return "Administrador"
  if (usuario.memberships.some((item) => item.role === "LIDER")) return "Líder"
  if (usuario.memberships.some((item) => item.role === "AGENTE")) return "Agente"
  if (usuario.memberships.some((item) => item.role === "OBSERVADOR")) return "Observador"
  return "Solicitante"
}

function etiquetaInvitacion(estado: EstadoEnlace) {
  if (estado === "aceptada") return "usada"
  return estado
}

export function UsuariosAdmin({
  usuarios,
  invitaciones,
  areas,
  empresas,
}: {
  usuarios: Usuario[]
  invitaciones: Invitacion[]
  areas: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<"usuarios" | "invitaciones">("usuarios")
  const [q, setQ] = useState("")
  const [rol, setRol] = useState("")
  const [estado, setEstado] = useState("")
  const [extra, setExtra] = useState(false)
  const [equipo, setEquipo] = useState("")
  const [pagina, setPagina] = useState(1)
  const [invitar, setInvitar] = useState(false)
  const [manual, setManual] = useState(false)
  const [editor, setEditor] = useState<Usuario | null>(null)
  const [pending, start] = useTransition()
  const tamano = 5
  const filtrados = useMemo(() => usuarios.filter((usuario) => {
    const texto = `${usuario.name} ${usuario.email}`.toLowerCase()
    if (q && !texto.includes(q.toLowerCase())) return false
    if (rol && rolDe(usuario) !== rol) return false
    const marca = usuario.pendiente ? "Pendiente" : usuario.active ? "Activo" : "Inactivo"
    if (estado && marca !== estado) return false
    if (equipo && !usuario.memberships.some((item) => item.team === equipo)) return false
    return true
  }), [usuarios, q, rol, estado, equipo])
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamano))
  const paginaSegura = Math.min(pagina, paginas)
  const corte = filtrados.slice((paginaSegura - 1) * tamano, paginaSegura * tamano)
  const inicio = filtrados.length === 0 ? 0 : (paginaSegura - 1) * tamano + 1
  const fin = Math.min(paginaSegura * tamano, filtrados.length)

  function alternar(usuario: Usuario) {
    const data = new FormData()
    data.set("userId", usuario.id)
    data.set("areaId", usuario.areaId)
    data.set("active", usuario.active ? "0" : "1")
    data.set("pendiente", usuario.pendiente ? "1" : "0")
    data.set("isAdmin", usuario.isAdmin ? "1" : "0")
    for (const id of usuario.empresaIds) data.append("empresaIds", id)
    for (const id of usuario.areaIds) data.append("areaIds", id)
    for (const item of usuario.memberships) data.set(`${item.role}:${item.team}`, "1")
    start(async () => {
      const result = await actualizarUsuarioAction(data)
      if (!result.ok) toast.error(result.error)
      else {
        toast.success(usuario.active ? "Usuario desactivado." : "Usuario activado.")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administra los accesos, roles y equipos de trabajo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setInvitar(true)} className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#1658B0] px-3 text-sm font-medium text-white hover:bg-[#222B7C]">
            <PlusIcon className="size-4" /> Invitar usuario
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
              Crear manualmente <ChevronDownIcon className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setManual(true)}>Con nombre y contraseña</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex gap-4 border-b border-[#E4E7EC]" role="tablist">
        {(["usuarios", "invitaciones"] as const).map((valor) => (
          <button key={valor} type="button" role="tab" aria-selected={tab === valor} className={tab === valor ? "border-b-2 border-[#1658B0] pb-2 text-sm font-medium text-[#1658B0]" : "pb-2 text-sm text-muted-foreground"} onClick={() => setTab(valor)}>
            {valor === "usuarios" ? "Usuarios" : "Invitaciones"}
          </button>
        ))}
      </div>
      {tab === "usuarios" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-56 flex-1">
              <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <input value={q} onChange={(event) => { setQ(event.target.value); setPagina(1) }} aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo..." className="h-10 w-full rounded-lg border border-[#E4E7EC] bg-white pr-3 pl-9 text-sm" />
            </label>
            <Elegir className="w-40" ariaLabel="Rol" value={rol} onValueChange={(valor) => { setRol(valor); setPagina(1) }} placeholder="Rol" opciones={[{ value: "", label: "Rol" }, ...["Administrador", "Líder", "Agente", "Observador", "Solicitante"].map((item) => ({ value: item, label: item }))]} />
            <Elegir className="w-40" ariaLabel="Estado" value={estado} onValueChange={(valor) => { setEstado(valor); setPagina(1) }} placeholder="Estado" opciones={[{ value: "", label: "Estado" }, { value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }, { value: "Pendiente", label: "Pendiente" }]} />
            <button type="button" aria-expanded={extra} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm" onClick={() => setExtra((valor) => !valor)}>
              <SlidersHorizontalIcon className="size-4" /> Filtros
            </button>
          </div>
          {extra ? (
            <Elegir className="w-52" ariaLabel="Equipo" value={equipo} onValueChange={(valor) => { setEquipo(valor); setPagina(1) }} opciones={[{ value: "", label: "Todos los equipos" }, { value: "DESARROLLO", label: "Desarrollo" }, { value: "MARKETING", label: "Marketing" }]} />
          ) : null}
          <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(21,18,42,0.04)]">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-[#F0F2F5]">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-3 py-3 font-medium">Rol</th>
                  <th className="px-3 py-3 font-medium">Área principal</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {corte.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay usuarios con esos filtros.</td></tr>
                ) : corte.map((usuario) => {
                  const color = tono(usuario.name)
                  const marca = usuario.pendiente ? "Pendiente" : usuario.active ? "Activo" : "Inactivo"
                  return (
                    <tr key={usuario.id} className="border-b border-[#F0F2F5] last:border-0">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <span className="inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold" style={{ background: color.fondo, color: color.tinta }}>{iniciales(usuario.name)}</span>
                          <span>
                            <span className="block font-medium">{usuario.name}</span>
                            <span className="block text-xs text-muted-foreground">{usuario.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3">{rolDe(usuario)}</td>
                      <td className="px-3 py-3">{usuario.area}</td>
                      <td className="px-3 py-3">
                        <span className={marca === "Activo" ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" : "rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#3d4a63]"}>{marca}</span>
                      </td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6]" aria-label={`Acciones de ${usuario.name}`}>⋯</DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditor(usuario)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditor(usuario)}>Cambiar rol</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => alternar(usuario)} disabled={pending}>{usuario.active ? "Desactivar" : "Activar"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-3 border-t border-[#F0F2F5] px-4 py-2 text-sm text-muted-foreground">
              <span>{inicio}–{fin} de {filtrados.length}</span>
              <button type="button" aria-label="Página anterior" disabled={paginaSegura <= 1} className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white disabled:opacity-40" onClick={() => setPagina(paginaSegura - 1)}>‹</button>
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[#1658B0] text-white">{paginaSegura}</span>
              <button type="button" aria-label="Página siguiente" disabled={paginaSegura >= paginas} className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E4E7EC] bg-white disabled:opacity-40" onClick={() => setPagina(paginaSegura + 1)}>›</button>
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E4E7EC] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-[#F0F2F5]">
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-3 py-3 font-medium">Rol</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Todavía no hay invitaciones.</td></tr>
              ) : invitaciones.map((item) => {
                const etiqueta = etiquetaInvitacion(item.estado)
                return (
                  <tr key={item.id} className="border-b border-[#F0F2F5] last:border-0">
                    <td className="px-4 py-3">{item.email}</td>
                    <td className="px-3 py-3">{ROLE_LABEL[item.role as RoleName] ?? item.role}</td>
                    <td className="px-3 py-3">
                      <span className={etiqueta === "pendiente" ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900" : etiqueta === "usada" ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800" : "rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs text-[#3d4a63]"}>{etiqueta}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        {item.estado === "pendiente" && item.enlace ? <CopiarEnlace enlace={item.enlace} /> : null}
                        {item.estado === "pendiente" ? (
                          <form action={revocarInvitacionFormAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <button className="text-sm text-[#1658B0] underline" type="submit">Revocar</button>
                          </form>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <InvitarDrawer abierto={invitar} onCerrar={() => setInvitar(false)} areas={areas} empresas={empresas} onManual={() => { setInvitar(false); setManual(true) }} />
      <Dialog open={manual} onOpenChange={setManual}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Crear manualmente</DialogTitle></DialogHeader>
          <FormularioUsuarioManual areas={areas} empresas={empresas} />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto) setEditor(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
          {editor ? <EditorUsuario areas={areas} empresas={empresas} user={editor} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InvitarDrawer({
  abierto,
  onCerrar,
  areas,
  empresas,
  onManual,
}: {
  abierto: boolean
  onCerrar: () => void
  areas: { id: string; name: string }[]
  empresas: { id: string; name: string }[]
  onManual: () => void
}) {
  const router = useRouter()
  const [rol, setRol] = useState("SOLICITANTE")
  const [areaId, setAreaId] = useState(areas[0]?.id || "")
  const [areasExtra, setAreasExtra] = useState<string[]>([])
  const [empresaIds, setEmpresaIds] = useState<string[]>([])
  const [enlace, setEnlace] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const pideEquipo = rol === "AGENTE" || rol === "LIDER" || rol === "OBSERVADOR"
  return (
    <Sheet open={abierto} onOpenChange={(valor) => { if (!valor) onCerrar() }}>
      <SheetContent side="right" className="w-[380px] bg-white sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle>Invitar usuario</SheetTitle>
          <SheetDescription>Genera un enlace para que la persona complete su registro.</SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          for (const id of areasExtra) data.append("areaIds", id)
          for (const id of empresaIds) data.append("empresaIds", id)
          start(async () => {
            const result = await crearInvitacionAction(data)
            if (!result.ok) {
              setError(result.error)
              setEnlace(null)
              return
            }
            setError(null)
            setEnlace(result.enlace || null)
            toast.success(result.message || "Invitación lista.")
            router.refresh()
          })
        }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-4">
            <section className="space-y-3">
              <h3 className="font-heading text-base">Datos de acceso</h3>
              <label className="grid gap-1.5 text-sm">
                Correo electrónico
                <input name="email" type="email" required placeholder="nombre@empresa.com" className="h-11 rounded-[10px] border border-[#D9DEE7] px-3" />
              </label>
              <label className="grid gap-1.5 text-sm">
                Rol
                <Elegir name="rol" ariaLabel="Rol" value={rol} onValueChange={setRol} opciones={(["SOLICITANTE", "AGENTE", "LIDER", "OBSERVADOR", "ADMINISTRADOR"] as const).map((item) => ({ value: item, label: ROLE_LABEL[item] }))} />
                <span className="text-xs font-normal text-muted-foreground">Define qué puede consultar y gestionar.</span>
              </label>
            </section>
            <section className="space-y-3">
              <h3 className="font-heading text-base">Organización</h3>
              <label className="grid gap-1.5 text-sm">
                Área principal
                <Elegir name="areaId" ariaLabel="Área principal" value={areaId} onValueChange={setAreaId} placeholder="Seleccionar área" opciones={[{ value: "", label: "Seleccionar área" }, ...areas.map((area) => ({ value: area.id, label: area.name }))]} />
              </label>
              <label className="grid gap-1.5 text-sm">
                Áreas adicionales · Opcional
                <ElegirVarios ariaLabel="Áreas adicionales" values={areasExtra} onChange={setAreasExtra} placeholder="Seleccionar áreas" opciones={areas.map((area) => ({ value: area.id, label: area.name }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                Empresas
                <ElegirVarios ariaLabel="Empresas" values={empresaIds} onChange={setEmpresaIds} placeholder="Seleccionar empresas" opciones={empresas.map((empresa) => ({ value: empresa.id, label: empresa.name }))} />
              </label>
              {pideEquipo ? (
                <fieldset className="grid gap-1 text-sm">
                  <legend>Equipo</legend>
                  <label className="flex items-center gap-2"><input type="checkbox" name="team:DESARROLLO" value="1" /> {TEAM_LABEL.DESARROLLO}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="team:MARKETING" value="1" /> {TEAM_LABEL.MARKETING}</label>
                </fieldset>
              ) : null}
            </section>
            <div className="flex gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-sm text-[#1E3A8A]">
              <LinkIcon className="mt-0.5 size-4 shrink-0" />
              <p>El enlace vence en 7 días y solo se puede usar una vez. La persona define su nombre y contraseña.</p>
            </div>
            {error ? <p className="text-sm text-red-800">{error}</p> : null}
            {enlace ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Enlace generado</p>
                <input readOnly value={enlace} aria-label="Enlace de invitación" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-xs" onFocus={(event) => event.currentTarget.select()} />
                <CopiarEnlace enlace={enlace} />
              </div>
            ) : null}
          </div>
          <SheetFooter className="flex-col items-stretch gap-2">
            <div className="flex gap-2">
              <button type="button" className="h-10 flex-1 rounded-lg border border-[#E4E7EC] bg-white text-sm" onClick={onCerrar}>Cancelar</button>
              <button type="submit" disabled={pending} className="h-10 flex-1 rounded-lg bg-[#1658B0] text-sm font-medium text-white disabled:opacity-60">{pending ? "Generando…" : "Generar enlace"}</button>
            </div>
            <button type="button" className="text-center text-sm text-[#1658B0] hover:underline" onClick={onManual}>¿Necesitas crear la cuenta manualmente?</button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
