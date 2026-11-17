import { redirect } from "next/navigation"
import { FormularioInvitacion, FormularioUsuarioManual } from "@/components/acceso-admin"
import { EditorUsuario } from "@/components/admin-forms"
import { CopiarEnlace } from "@/components/copiar-enlace"
import { estadoEnlace } from "@/lib/invitacion-estado"
import { appBaseUrl } from "@/lib/email"
import { puedeAdministrar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { revocarInvitacionFormAction } from "@/server/actions"
import { requireActor } from "@/server/session"
import { catalogos } from "@/server/requests"

export default async function UsuariosPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const [data, empresas, invitaciones] = await Promise.all([
    catalogos(),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.invitacion.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { } }),
  ])
  const areas = data.areas.filter((area) => area.active).map((area) => ({ id: area.id, name: area.name }))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          La vía principal es la invitación por enlace. También puede crear la cuenta a mano, activarla, desactivarla o generar un enlace para restablecer la contraseña.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormularioInvitacion areas={areas} empresas={empresas} />
        <FormularioUsuarioManual areas={areas} empresas={empresas} />
      </div>
      <section className="rounded-lg border border-border bg-white">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Invitaciones</h2>
        <ul className="divide-y divide-border">
          {invitaciones.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Todavía no hay invitaciones.</li> : invitaciones.map((item) => {
            const estado = estadoEnlace(item)
            const enlace = item.tokenPlain ? `${appBaseUrl()}/invitar/${item.tokenPlain}` : ""
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>{item.email} · {item.role} · <span className="font-medium">{estado}</span></span>
                <span className="flex items-center gap-2">
                  {estado === "pendiente" && enlace ? <CopiarEnlace enlace={enlace} /> : null}
                  {estado === "pendiente" ? (
                    <form action={revocarInvitacionFormAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="text-sm underline" type="submit">Revocar</button>
                    </form>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
      <div className="grid gap-3">
        {data.users.map((user) => (
          <EditorUsuario
            key={user.id}
            areas={areas}
            empresas={empresas}
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              areaId: user.areaId,
              active: user.active,
              pendiente: user.pendiente,
              isAdmin: user.role === "ADMINISTRADOR",
              empresaIds: user.empresas.map((item) => item.empresaId),
              areaIds: user.areasExtra.map((item) => item.areaId),
              memberships: user.areaRoles
                .filter((item) => item.role === "AGENTE" || item.role === "LIDER" || item.role === "OBSERVADOR")
                .map((item) => ({ team: item.team, role: item.role as "AGENTE" | "LIDER" | "OBSERVADOR" })),
            }}
          />
        ))}
      </div>
    </div>
  )
}
