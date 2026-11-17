import { redirect } from "next/navigation"
import { FormularioInvitacion, FormularioUsuarioManual } from "@/components/acceso-admin"
import { EditorUsuario } from "@/components/admin-forms"
import { puedeAdministrar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import { catalogos } from "@/server/requests"

export default async function UsuariosPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const [data, empresas] = await Promise.all([
    catalogos(),
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
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
