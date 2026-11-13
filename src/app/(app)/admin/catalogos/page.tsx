import { redirect } from "next/navigation"
import { EditorTipo, FormularioArea, FormularioTipo } from "@/components/admin-forms"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { puedeAdministrar } from "@/lib/permissions"
import { requireActor } from "@/server/session"
import { catalogos } from "@/server/requests"

export default async function CatalogosPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const data = await catalogos()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Catálogos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Áreas de quien radica y tipos de requerimiento de cada equipo, con su SLA en horas hábiles.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Áreas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="flex flex-wrap gap-2 text-sm">
            {data.areas.map((area) => (
              <li key={area.id} className="rounded-full bg-muted px-3 py-1">{area.name}{area.active ? "" : " (inactiva)"}</li>
            ))}
          </ul>
          <FormularioArea />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Nuevo tipo</CardTitle></CardHeader>
        <CardContent><FormularioTipo /></CardContent>
      </Card>
      <div className="grid gap-3">
        {data.types.map((tipo) => (
          <EditorTipo
            key={tipo.id}
            tipo={{
              id: tipo.id,
              name: tipo.name,
              team: tipo.team,
              description: tipo.description,
              slaMinutes: tipo.slaMinutes,
              requiresApproval: tipo.requiresApproval,
              active: tipo.active,
            }}
          />
        ))}
      </div>
    </div>
  )
}
