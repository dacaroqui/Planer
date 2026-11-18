"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function FiltrosPlanner({
  empresas,
  proyectos,
  responsables,
}: {
  empresas: { id: string; name: string }[]
  proyectos: { id: string; name: string; empresaId: string; empresa: string }[]
  responsables: { id: string; name: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const empresa = params.get("empresa") ?? ""
  function ir(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString())
    if (!valor) next.delete(clave)
    else next.set(clave, valor)
    if (clave === "empresa") next.delete("proyecto")
    const query = next.toString()
    router.push(query ? `/planner?${query}` : "/planner")
  }
  const clase = "h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm"
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <select aria-label="Empresa" className={clase} value={empresa} onChange={(event) => ir("empresa", event.target.value)}>
        <option value="">Todas las empresas</option>
        {empresas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select aria-label="Proyecto" className={clase} value={params.get("proyecto") ?? ""} onChange={(event) => ir("proyecto", event.target.value)}>
        <option value="">Todos los proyectos</option>
        {proyectos.filter((item) => !empresa || item.empresaId === empresa).map((item) => (
          <option key={item.id} value={item.id}>{item.empresa ? `${item.empresa} · ${item.name}` : item.name}</option>
        ))}
      </select>
      <select aria-label="Responsable" className={clase} value={params.get("responsable") ?? ""} onChange={(event) => ir("responsable", event.target.value)}>
        <option value="">Todos los responsables</option>
        {responsables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
  )
}
