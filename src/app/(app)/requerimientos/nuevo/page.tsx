import { FormularioRadicar } from "@/components/formulario-radicar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"

export default async function NuevoPage() {
  const actor = await requireActor()
  if (!puedeRadicar(actor)) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-4xl">Radicar</h1>
        <p className="mt-3 text-sm text-muted-foreground">Su perfil es de solo lectura. Puede consultar el estado y el historial, pero no radica requerimientos.</p>
      </div>
    )
  }
  const [tipos, area] = await Promise.all([
    prisma.requestType.findMany({ where: { active: true }, orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.area.findUnique({ where: { id: actor.areaId } }),
  ])
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Radicar requerimiento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cuente qué necesita Desarrollo o Marketing. El consecutivo, el SLA y el historial se crean al enviar.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Datos del requerimiento</CardTitle></CardHeader>
        <CardContent>
          <FormularioRadicar
            area={area?.name ?? "su área"}
            tipos={tipos.map((tipo) => ({
              id: tipo.id,
              team: tipo.team,
              name: tipo.name,
              description: tipo.description,
              slaMinutes: tipo.slaMinutes,
              requiresApproval: tipo.requiresApproval,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
