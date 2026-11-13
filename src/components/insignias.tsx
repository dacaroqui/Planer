import { Badge } from "@/components/ui/badge"
import {
  BRAND_LABEL,
  PRIORITY_LABEL,
  SLA_LABEL,
  TEAM_LABEL,
  type BrandName,
  type PriorityName,
  type SlaState,
  type TeamName,
} from "@/lib/domain"
import { slaClass, statusClass, statusText } from "@/lib/format"
import { cn } from "@/lib/utils"

export function EstadoBadge({ status }: { status: string }) {
  return <Badge className={cn("border-transparent", statusClass(status))}>{statusText(status)}</Badge>
}

export function SlaBadge({ state }: { state: SlaState }) {
  return <Badge className={cn("border-transparent", slaClass(state))}>{SLA_LABEL[state]}</Badge>
}

export function EquipoBadge({ team }: { team: TeamName }) {
  return <Badge variant="outline">{TEAM_LABEL[team]}</Badge>
}

export function PrioridadTexto({ priority }: { priority: PriorityName }) {
  return <span>{PRIORITY_LABEL[priority]}</span>
}

export function MarcaTexto({ brand }: { brand: BrandName }) {
  return <span>{BRAND_LABEL[brand]}</span>
}
