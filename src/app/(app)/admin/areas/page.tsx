import { redirect } from "next/navigation"
import { AreasAdmin } from "@/components/areas-admin"
import { puedeAdministrar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listarAreasTrabajo } from "@/server/equipos-admin"
import { requireActor } from "@/server/session"

export default async function AreasPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const [equipos, personas] = await Promise.all([
    listarAreasTrabajo(),
    prisma.user.findMany({
      where: { active: true, deactivatedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl">Áreas</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Producto, Marketing, Comercial, Innovación, Administración y Growth. El nombre, el icono, los líderes, los tipos y el flujo se editan aquí. El prefijo del radicado sigue atado al equipo de código.
        </p>
      </div>
      <AreasAdmin equipos={equipos} personas={personas} />
    </div>
  )
}
