import { PerfilFormulario } from "@/components/perfil-formulario"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export default async function PerfilPage() {
  const actor = await requireActor()
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>
      <PerfilFormulario nombre={user.name} cargo={user.cargo} email={user.email} avatar={user.avatar} />
    </div>
  )
}
