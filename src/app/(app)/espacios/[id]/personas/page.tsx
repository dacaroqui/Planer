import { Suspense } from "react"
import { notFound } from "next/navigation"
import { FiltrosPersonas } from "@/components/personas-filtros"
import { PersonasLista } from "@/components/personas-lista"
import { TEAMS, type TeamName } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listarPersonas } from "@/server/personas"
import { requireActor } from "@/server/session"

export default async function PersonasEspacio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireActor()
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  const query = await searchParams
  const one = (key: string) => {
    const value = query[key]
    return Array.isArray(value) ? value[0] : value
  }
  const equipo = one("equipo")
  const filas = await listarPersonas(actor, {
    espacio: id,
    equipo: equipo === "DESARROLLO" || equipo === "MARKETING" ? equipo : undefined,
    area: one("area"),
    soloVacias: one("vacias") === "1",
  })
  const areas = await prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  const equipos = (esAdmin(actor) ? TEAMS : [...new Set(actor.memberships.map((item) => item.team))]) as TeamName[]
  return (
    <div className="space-y-4">
      <Suspense>
        <FiltrosPersonas base={`/espacios/${id}/personas`} espacios={[{ id, name: empresa.name }]} areas={areas} equipos={equipos.length ? equipos : ["DESARROLLO", "MARKETING"]} ocultarEspacio />
      </Suspense>
      <PersonasLista filas={filas} />
    </div>
  )
}
