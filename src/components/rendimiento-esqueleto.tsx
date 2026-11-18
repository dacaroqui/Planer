export function EsqueletoRendimiento() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando rendimiento">
      <div className="h-8 w-64 animate-pulse rounded bg-[#E1EBF9]" />
      <div className="h-36 animate-pulse rounded-xl bg-white" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, indice) => (
          <div key={indice} className="h-24 animate-pulse rounded-xl bg-[#E1EBF9]" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-white" />
    </div>
  )
}
