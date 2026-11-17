export function Barra({ porcentaje }: { porcentaje: number }) {
  const ancho = Math.max(0, Math.min(100, porcentaje))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`Avance ${ancho}%`}>
      <div className="h-2 rounded-full bg-primary" style={{ width: `${ancho}%` }} />
    </div>
  )
}
