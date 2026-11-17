"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { marcaObligatoria, movimientoCierra, type MovimientoTablero } from "@/lib/tablero-movimiento"

export function CamposMovimiento({
  prefijo,
  movimiento,
  pideResponsable,
  pideFecha,
  agentes,
  responsableId,
  onResponsable,
  fecha,
  onFecha,
  resolucion,
  onResolucion,
  motivo,
  onMotivo,
  entrega,
  onEntrega,
}: {
  prefijo: string
  movimiento: MovimientoTablero | null
  pideResponsable: boolean
  pideFecha: boolean
  agentes: { id: string; name: string }[]
  responsableId: string
  onResponsable: (valor: string) => void
  fecha: string
  onFecha: (valor: string) => void
  resolucion: string
  onResolucion: (valor: string) => void
  motivo: string
  onMotivo: (valor: string) => void
  entrega: string
  onEntrega: (valor: string) => void
}) {
  if (!movimiento) return null
  const fechaObligatoria = marcaObligatoria("Fecha comprometida")
  const cierra = movimientoCierra(movimiento)
  return (
    <>
      {pideResponsable ? (
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-responsable`}>Responsable *</Label>
          <select id={`${prefijo}-responsable`} className="h-9 rounded-lg border border-input px-2 text-sm" aria-required="true" value={responsableId} onChange={(event) => onResponsable(event.target.value)} aria-label="Responsable">
            <option value="">Elija un responsable</option>
            {agentes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      ) : null}
      {pideFecha ? (
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-fecha`}>{fechaObligatoria.etiqueta}</Label>
          <Input id={`${prefijo}-fecha`} type="date" lang="es-CO" aria-required={fechaObligatoria.ariaRequired} value={fecha} onChange={(event) => onFecha(event.target.value)} />
        </div>
      ) : null}
      {cierra && movimiento.to === "CERRADO" ? (
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-resolucion`}>Resolución</Label>
          <select id={`${prefijo}-resolucion`} className="h-9 rounded-lg border border-input px-2 text-sm" value={resolucion} onChange={(event) => onResolucion(event.target.value)} aria-label="Resolución">
            <option value="RESUELTO">Resuelto</option>
            <option value="NO_SE_HARA">No se hará</option>
            <option value="DUPLICADO">Duplicado</option>
            <option value="CANCELADO_SOLICITANTE">Cancelado por el solicitante</option>
          </select>
        </div>
      ) : null}
      {movimiento.requiresComment || cierra ? (
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-motivo`}>Motivo</Label>
          <Textarea id={`${prefijo}-motivo`} value={motivo} onChange={(event) => onMotivo(event.target.value)} rows={3} placeholder="Queda en el historial." />
        </div>
      ) : null}
      {movimiento.requiresDelivery ? (
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-entrega`}>Enlace de la entrega</Label>
          <Input id={`${prefijo}-entrega`} value={entrega} onChange={(event) => onEntrega(event.target.value)} placeholder="https://" />
          <p className="text-xs text-muted-foreground">Si el requerimiento ya tiene un adjunto, puede dejar el enlace vacío.</p>
        </div>
      ) : null}
    </>
  )
}
