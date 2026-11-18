import Link from "next/link"
import { IconoEstado, IconoTab } from "@/components/growth-iconos"
import { ESTADO_LABEL, type EstadoGrowth } from "@/lib/growth"

const TABS = [
  { id: "embudo", label: "Embudo" },
  { id: "ciclo", label: "Ciclo actual" },
  { id: "experimentos", label: "Experimentos" },
  { id: "aprendizajes", label: "Aprendizajes" },
] as const

export function MarcaChip({ brand }: { brand: string }) {
  const luvania = brand === "LUVANIA"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${luvania ? "bg-[#FDE8E6] text-[#C2410C]" : "bg-[#E7F0FB] text-[#1658B0]"}`}>
      <span className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ${luvania ? "bg-[#EE876B]" : "bg-[#1658B0]"}`}>{luvania ? "L" : "C"}</span>
      {brand === "LUVANIA" ? "Luvania" : brand === "CIFES" ? "CIFES" : "Ambas"}
    </span>
  )
}

export function EstadoChip({ estado }: { estado: string }) {
  const texto = ESTADO_LABEL[estado as EstadoGrowth] ?? estado
  const clase = estado === "EN_EJECUCION"
    ? "bg-[#E7F0FB] text-[#1658B0]"
    : estado === "REVISION"
      ? "bg-[#F3E8FF] text-[#6D28D9]"
      : estado === "BORRADOR"
        ? "bg-[#F3F4F6] text-[#3d4a63]"
        : estado === "CERRADO"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-[#FEF3C7] text-[#92400E]"
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${clase}`}><IconoEstado estado={estado} />{texto}</span>
}

export function TabsGrowth({ tab, marca, ciclo }: { tab: string; marca: string; ciclo: string }) {
  return (
    <nav className="flex gap-6 border-b border-[#E4E7EC]" aria-label="Vistas de Growth">
      {TABS.map((item) => {
        const activo = tab === item.id
        const query = new URLSearchParams({ tab: item.id, marca, ciclo })
        return (
          <Link key={item.id} href={`/growth?${query}`} className={activo ? "inline-flex items-center gap-1.5 border-b-2 border-[#1658B0] pb-2 text-sm font-medium text-[#1658B0]" : "inline-flex items-center gap-1.5 pb-2 text-sm text-[#667085] hover:text-[#15122A]"} aria-current={activo ? "page" : undefined}>
            <IconoTab id={item.id} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function FiltrosGrowth({
  marca,
  cicloId,
  ciclos,
  ilustrativo,
}: {
  marca: string
  cicloId: string
  ciclos: { id: string; nombre: string }[]
  ilustrativo: boolean
}) {
  return (
    <form className="flex flex-wrap items-center gap-2" action="/growth">
      <input type="hidden" name="tab" value="embudo" />
      <select name="marca" defaultValue={marca} aria-label="Marca" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
        <option value="LUVANIA">Luvania</option>
        <option value="CIFES">CIFES</option>
        <option value="AMBAS">Ambas</option>
      </select>
      <select name="ciclo" defaultValue={cicloId} aria-label="Ciclo" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
        {ciclos.length === 0 ? <option value="">Sin ciclos</option> : ciclos.map((ciclo) => <option key={ciclo.id} value={ciclo.id}>{ciclo.nombre}</option>)}
      </select>
      <button type="submit" className="h-10 rounded-lg border border-[#E4E7EC] px-3 text-sm">Aplicar</button>
      {ilustrativo ? <span className="text-sm font-medium text-[#1658B0]">Datos de ejemplo</span> : null}
    </form>
  )
}
