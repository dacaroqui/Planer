import { TEAM_LABEL, type TeamName } from "@/lib/domain"

export type PersonaAsignable = { id: string; name: string; grupo: string; teams: TeamName[]; esAdmin: boolean }

export type Candidato = { id: string; name: string; teams: TeamName[]; esAdmin: boolean }

export function opcionesPersona(esAdmin: boolean, area: TeamName | "", candidatos: Candidato[]) {
  const lideres = esAdmin
    ? candidatos.filter((persona) => persona.esAdmin).map((persona) => ({ id: persona.id, name: persona.name, grupo: "Líderes" }))
    : []
  const delArea = area
    ? candidatos
        .filter((persona) => !persona.esAdmin && persona.teams.includes(area))
        .map((persona) => ({ id: persona.id, name: persona.name, grupo: TEAM_LABEL[area] }))
    : []
  return [...lideres, ...delArea]
}

export function agruparAsignables(input: {
  esAdmin: boolean
  team?: TeamName | null
  admins: { id: string; name: string }[]
  miembros: { id: string; name: string; teams: TeamName[] }[]
}): PersonaAsignable[] {
  if (!input.esAdmin) {
    if (!input.team) return []
    return input.miembros
      .filter((persona) => persona.teams.includes(input.team as TeamName))
      .map((persona) => ({ id: persona.id, name: persona.name, grupo: TEAM_LABEL[input.team as TeamName], teams: persona.teams, esAdmin: false }))
  }
  const ids = new Set(input.admins.map((persona) => persona.id))
  return [
    ...input.admins.map((persona) => ({ id: persona.id, name: persona.name, grupo: "Líderes", teams: [] as TeamName[], esAdmin: true })),
    ...input.miembros
      .filter((persona) => !ids.has(persona.id))
      .map((persona) => ({ id: persona.id, name: persona.name, grupo: "Cualquier área", teams: persona.teams, esAdmin: false })),
  ]
}
