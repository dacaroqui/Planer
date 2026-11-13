import { redirect } from "next/navigation"
import { EditorUsuario } from "@/components/admin-forms"
import { puedeAdministrar } from "@/lib/permissions"
import { requireActor } from "@/server/session"
import { catalogos } from "@/server/requests"

export default async function UsuariosPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const data = await catalogos()
  const areas = data.areas.filter((area) => area.active).map((area) => ({ id: area.id, name: area.name }))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Quien entra por Microsoft queda como solicitante. Aquí se eleva el rol, se asigna el equipo y se desactiva una cuenta.
        </p>
      </div>
      <div className="grid gap-3">
        {data.users.map((user) => (
          <EditorUsuario
            key={user.id}
            areas={areas}
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              areaId: user.areaId,
              active: user.active,
              isAdmin: user.role === "ADMINISTRADOR",
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
