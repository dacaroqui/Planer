export function Esqueleto() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-40 animate-pulse rounded bg-[#E1EBF9]" />
      <div className="h-10 animate-pulse rounded bg-white" />
      <div className="h-72 animate-pulse rounded-lg bg-white" />
    </div>
  )
}
