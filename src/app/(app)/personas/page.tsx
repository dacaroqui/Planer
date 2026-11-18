import { Suspense } from "react"
import { FiltrosPersonas } from "@/components/personas-filtros"
import { PersonasLista } from "@/components/personas-lista"
import { TEAMS, esTeam, type TeamName } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listarPersonas } from "@/server/personas"
import { requireActor } from "@/server/session"

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const equipo = one("equipo")
  const filas = await listarPersonas(actor, {
    espacio: one("espacio"),
    equipo: equipo && esTeam(equipo) ? equipo : undefined,
    area: one("area"),
    soloVacias: one("vacias") === "1",
    persona: one("persona"),
  })
  const [espacios, areas] = await Promise.all([
    prisma.empresa.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  const equipos = (esAdmin(actor) ? TEAMS : [...new Set(actor.memberships.map((item) => item.team))]) as TeamName[]
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl">Personas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Requerimientos y tareas abiertos de cada persona. Quien no tiene nada aparece igual.</p>
      </div>
      <Suspense>
        <FiltrosPersonas base="/personas" espacios={espacios} areas={areas} equipos={equipos.length ? equipos : ["DESARROLLO", "MARKETING"]} />
      </Suspense>
      <PersonasLista filas={filas} />
    </div>
  )
}
