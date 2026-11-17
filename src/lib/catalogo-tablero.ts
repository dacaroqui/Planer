import type { TeamName } from "@/lib/domain"
import type { TransicionOficial } from "@/lib/flujo-oficial"

export function catalogoTablero(rows: Array<{
  team: TeamName
  name: string
  fromKeys: string
  toKey: string
  allowedRoles: string
  slaEffect: string
  requiresComment: boolean
  requiresDelivery: boolean
  requiresAssignee: boolean
  requiresCommittedDate: boolean
}>): TransicionOficial[] {
  return rows.map((row) => ({
    team: row.team,
    name: row.name,
    from: row.fromKeys.split(",").filter(Boolean),
    to: row.toKey,
    roles: row.allowedRoles.split(",").filter(Boolean) as TransicionOficial["roles"],
    slaEffect: row.slaEffect as TransicionOficial["slaEffect"],
    requiresComment: row.requiresComment,
    requiresDelivery: row.requiresDelivery,
    requiresAssignee: row.requiresAssignee,
    requiresCommittedDate: row.requiresCommittedDate,
  }))
}
