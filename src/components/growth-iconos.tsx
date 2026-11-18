import {
  BookOpenIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  CircleHelpIcon,
  ClipboardListIcon,
  FlaskConicalIcon,
  FunnelIcon,
  LightbulbIcon,
  ListChecksIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PencilIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  ShoppingBagIcon,
  TargetIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon,
  WrenchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import type { DecisionGrowth, EstadoGrowth } from "@/lib/growth"

const marca = "size-4 shrink-0"

function Icono({ icono: IconoLucide, className = marca }: { icono: LucideIcon; className?: string }) {
  return <IconoLucide className={className} aria-hidden />
}

const TABS: Record<string, LucideIcon> = {
  embudo: FunnelIcon,
  ciclo: CalendarDaysIcon,
  experimentos: FlaskConicalIcon,
  aprendizajes: LightbulbIcon,
}

export function IconoTab({ id }: { id: string }) {
  return <Icono icono={TABS[id] ?? FunnelIcon} />
}

const ETAPAS: { clave: string; icono: LucideIcon }[] = [
  { clave: "consulta", icono: MessageCircleIcon },
  { clave: "valoracion", icono: CalendarCheckIcon },
  { clave: "asistencia", icono: UserCheckIcon },
  { clave: "recompra", icono: RotateCcwIcon },
  { clave: "compra", icono: ShoppingBagIcon },
]

export function IconoEtapa({ nombre }: { nombre: string }) {
  const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const icono = ETAPAS.find((item) => clave.includes(item.clave))?.icono ?? FunnelIcon
  return <Icono icono={icono} />
}

const SECCIONES: Record<string, LucideIcon> = {
  "1": ClipboardListIcon,
  "2": SearchIcon,
  "3": LightbulbIcon,
  "4": TargetIcon,
  "5": MessagesSquareIcon,
  "6": ListChecksIcon,
  "7": BookOpenIcon,
}

export function IconoSeccion({ n }: { n: string }) {
  return <Icono icono={SECCIONES[n] ?? ClipboardListIcon} />
}

const ESTADOS: Record<EstadoGrowth, LucideIcon> = {
  BORRADOR: PencilIcon,
  REVISION: UsersIcon,
  PREPARACION: WrenchIcon,
  EN_EJECUCION: PlayIcon,
  ANALISIS: TrendingUpIcon,
  CERRADO: CheckIcon,
}

export function IconoEstado({ estado }: { estado: string }) {
  return <Icono icono={ESTADOS[estado as EstadoGrowth] ?? CircleHelpIcon} className="size-3.5 shrink-0" />
}

const DECISIONES: Record<DecisionGrowth, LucideIcon> = {
  ADOPTAR: CheckIcon,
  ITERAR: RefreshCwIcon,
  DESCARTAR: XIcon,
  INCONCLUSO: CircleHelpIcon,
}

export function IconoDecision({ decision }: { decision: string }) {
  return <Icono icono={DECISIONES[decision as DecisionGrowth] ?? CircleHelpIcon} className="size-3.5 shrink-0" />
}

export function IconoExperimento() {
  return <FlaskConicalIcon className="size-4 shrink-0 text-[#1658B0]" aria-hidden />
}
