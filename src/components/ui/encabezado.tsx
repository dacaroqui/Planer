export function Encabezado({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string
  subtitulo?: string
  acciones?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading">{titulo}</h1>
        {subtitulo ? <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{subtitulo}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </div>
  )
}
