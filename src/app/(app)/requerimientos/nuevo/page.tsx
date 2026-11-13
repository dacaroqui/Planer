import { FormularioRadicar } from "@/components/formulario-radicar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { puedeRadicar } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { requireActor } from "@/server/session"
import { asegurarCatalogo } from "@/server/semilla"

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
  await asegurarCatalogo()
  const [tipos, area, marcas, prioridades] = await Promise.all([
    prisma.requestType.findMany({ where: { active: true }, orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.area.findUnique({ where: { id: actor.areaId } }),
    prisma.catalogItem.findMany({ where: { kind: "MARCA", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.catalogItem.findMany({ where: { kind: "PRIORIDAD", active: true }, orderBy: { sortOrder: "asc" } }),
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
              extra: tipo.extra,
            }))}
            marcas={marcas.map((item) => ({ key: item.key, name: item.name }))}
            prioridades={prioridades.map((item) => ({ key: item.key, name: item.name }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
