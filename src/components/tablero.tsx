"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deshacerTransicionAction, transicionarAction } from "@/server/actions"
import { SlaBadge } from "@/components/insignias"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { debePedirProyecto, debePedirResponsable, movimientoAlSoltar, movimientoCierra, movimientoExigeDialogo, validarDatosMovimiento, type MovimientoTablero } from "@/lib/tablero-movimiento"
import { BRAND_LABEL, PRIORITY_LABEL, type BrandName, type PriorityName } from "@/lib/domain"

export type Tarjeta = {
  code: string
  title: string
  brand: string
  priority: string
  assignee: string
  tipo: string
  status: string
  column: string
  sla: "A_TIEMPO" | "EN_RIESGO" | "VENCIDO" | "EN_PAUSA" | "CUMPLIDO" | "INCUMPLIDO" | "NO_APLICA"
  exigeProyecto?: boolean
  projectId?: string | null
  assigneeId?: string | null
  committedDate?: string | null
  proyectos?: { id: string; name: string }[]
  moves: MovimientoTablero[]
}

export function Tablero({ columnas, tarjetas, soloLectura, agentes = [] }: { columnas: string[]; tarjetas: Tarjeta[]; soloLectura: boolean; agentes?: { id: string; name: string }[] }) {

  const router = useRouter()
  const arrastrada = useRef<string | null>(null)
  const [marca, setMarca] = useState("TODAS")
  const [responsable, setResponsable] = useState("TODOS")
  const [tipo, setTipo] = useState("TODOS")
  const [error, setError] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<{ code: string; moves: MovimientoTablero[]; elegido: string } | null>(null)
  const [motivo, setMotivo] = useState("")
  const [entrega, setEntrega] = useState("")
  const [proyectoId, setProyectoId] = useState("")
  const [responsableId, setResponsableId] = useState("")
  const [fecha, setFecha] = useState("")
  const [resolucion, setResolucion] = useState("RESUELTO")
  const [pending, start] = useTransition()
  const responsables = [...new Set(tarjetas.map((item) => item.assignee))]
  const tipos = [...new Set(tarjetas.map((item) => item.tipo))]
  const visibles = tarjetas.filter((item) => (marca === "TODAS" || item.brand === marca) && (responsable === "TODOS" || item.assignee === responsable) && (tipo === "TODOS" || item.tipo === tipo))
  const movimiento = dialogo?.moves.find((item) => item.name === dialogo.elegido) ?? dialogo?.moves[0]

  function iniciarArrastre(event: React.DragEvent<HTMLElement>) {
    const code = event.currentTarget.getAttribute("data-code") || ""
    arrastrada.current = code
    event.dataTransfer.setData("text/plain", code)
    event.dataTransfer.effectAllowed = "move"
  }

  function ejecutar(code: string, move: MovimientoTablero, comment: string, deliveryUrl: string) {
    const origen = tarjetas.find((item) => item.code === code)
    const validacion = validarDatosMovimiento(move, comment, deliveryUrl, {
      assigneeId: origen?.assigneeId || responsableId,
      committedDate: origen?.committedDate || fecha,
    })
    if (validacion) {
      setError(validacion)
      toast.error(validacion)
      return
    }
    const data = new FormData()
    data.set("code", code)
    data.set("name", move.name)
    data.set("comment", comment)
    data.set("deliveryUrl", deliveryUrl)
    if (proyectoId) data.set("projectId", proyectoId)
    if (responsableId) data.set("assigneeId", responsableId)
    if (fecha) data.set("committedDate", fecha)
    if (movimientoCierra(move)) data.set("resolution", resolucion)
    setError(null)
    start(async () => {
      const result = await transicionarAction(data)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setDialogo(null)
      toast.success(result.message || `${code} cambió de estado.`, {
        duration: 10000,
        action: {
          label: "Deshacer",
          onClick: () => {
            const deshacer = new FormData()
            deshacer.set("code", code)
            start(async () => {
              const vuelta = await deshacerTransicionAction(deshacer)
              if (!vuelta.ok) {
                toast.error(vuelta.error)
                return
              }
              toast.success(vuelta.message || `Se deshizo el cambio de ${code}.`)
              router.refresh()
            })
          },
        },
      })
      router.refresh()
    })
  }

  function soltar(event: React.DragEvent<HTMLElement>, columna: string) {
    event.preventDefault()
    event.stopPropagation()
    const code = arrastrada.current || event.dataTransfer.getData("text/plain")
    arrastrada.current = null
    const decision = movimientoAlSoltar(tarjetas, code, columna)
    if (!decision.ok) {
      setError(decision.error)
      toast.error(decision.error)
      return
    }
    const move = decision.moves[0]
    const tarjeta = tarjetas.find((item) => item.code === decision.code)
    const pideResponsable = tarjeta ? debePedirResponsable(tarjeta, move) : Boolean(move.requiresAssignee)
    const pideFecha = Boolean(move.requiresCommittedDate) && !tarjeta?.committedDate
    if (decision.moves.length > 1 || movimientoExigeDialogo(move) || pideResponsable || pideFecha || (tarjeta && debePedirProyecto(tarjeta, move))) {
      setMotivo("")
      setEntrega("")
      setProyectoId(tarjeta?.projectId ?? "")
      setResponsableId(tarjeta?.assigneeId ?? "")
      setFecha(tarjeta?.committedDate ?? "")
      setResolucion("RESUELTO")
      setDialogo({ code: decision.code, moves: decision.moves, elegido: move.name })
      return
    }
    ejecutar(decision.code, move, "", "")
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={marca} onValueChange={setMarca}>
          <SelectTrigger className="w-full" aria-label="Marca"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas las marcas</SelectItem>
            <SelectItem value="CIFES">CIFES</SelectItem>
            <SelectItem value="LUVANIA">Luvania</SelectItem>
            <SelectItem value="AMBAS">Ambas/Transversal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full" aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            {tipos.map((nombre) => <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={responsable} onValueChange={setResponsable}>
          <SelectTrigger className="w-full" aria-label="Responsable"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los responsables</SelectItem>
            {responsables.map((nombre) => <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columnas.map((columna) => (
          <section
            key={columna}
            className="w-72 shrink-0 rounded-xl bg-muted/70 p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { if (!soloLectura) soltar(event, columna) }}
          >
            <h2 className="px-1 py-2 text-sm font-medium">{columna}</h2>
            <div className="grid gap-2">
              {visibles.filter((item) => item.column === columna).map((item) => (
                <article
                  key={item.code}
                  data-code={item.code}
                  draggable={!soloLectura && !pending}
                  onDragStart={iniciarArrastre}
                  className="rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <Link href={`/requerimientos/${item.code}`} draggable={false} className="font-medium hover:underline">{item.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{item.code} · {BRAND_LABEL[item.brand as BrandName] ?? item.brand} · {PRIORITY_LABEL[item.priority as PriorityName] ?? item.priority}</p>
                  <p className="text-xs text-muted-foreground">{item.assignee}</p>
                  <div className="mt-2"><SlaBadge state={item.sla} /></div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Dialog open={Boolean(dialogo)} onOpenChange={(open) => { if (!open) setDialogo(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover {dialogo?.code}</DialogTitle>
          </DialogHeader>
          {dialogo && dialogo.moves.length > 1 ? (
            <div className="grid gap-2">
              {dialogo.moves.map((item) => (
                <label key={item.name} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="movimiento" checked={dialogo.elegido === item.name} onChange={() => setDialogo({ ...dialogo, elegido: item.name })} />
                  {item.name}
                </label>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">{movimiento?.name}</p>}
          {dialogo && debePedirProyecto(tarjetas.find((item) => item.code === dialogo.code) ?? { status: "NUEVO" }, movimiento ?? { to: "EN_ANALISIS" }) ? (
            <div className="grid gap-1">
              <Label htmlFor="proyecto-tablero">Proyecto</Label>
              <select id="proyecto-tablero" className="h-9 rounded-lg border border-input px-2 text-sm" value={proyectoId} onChange={(event) => setProyectoId(event.target.value)} aria-label="Proyecto">
                <option value="">Elija un proyecto</option>
                {(tarjetas.find((item) => item.code === dialogo.code)?.proyectos ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          ) : null}
          {dialogo && movimiento && debePedirResponsable(tarjetas.find((item) => item.code === dialogo.code) ?? {}, movimiento) ? (
            <div className="grid gap-1">
              <Label htmlFor="responsable-tablero">Responsable</Label>
              <select id="responsable-tablero" className="h-9 rounded-lg border border-input px-2 text-sm" value={responsableId} onChange={(event) => setResponsableId(event.target.value)} aria-label="Responsable">
                <option value="">Elija un responsable</option>
                {agentes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          ) : null}
          {movimiento?.requiresCommittedDate && !tarjetas.find((item) => item.code === dialogo?.code)?.committedDate ? (
            <div className="grid gap-1">
              <Label htmlFor="fecha-tablero">Fecha comprometida</Label>
              <Input id="fecha-tablero" type="date" lang="es-CO" value={fecha} onChange={(event) => setFecha(event.target.value)} />
            </div>
          ) : null}
          {movimiento && movimientoCierra(movimiento) ? (
            <div className="grid gap-1">
              <Label htmlFor="resolucion-tablero">Resolución</Label>
              <select id="resolucion-tablero" className="h-9 rounded-lg border border-input px-2 text-sm" value={resolucion} onChange={(event) => setResolucion(event.target.value)} aria-label="Resolución">
                <option value="RESUELTO">Resuelto</option>
                <option value="NO_SE_HARA">No se hará</option>
                <option value="DUPLICADO">Duplicado</option>
                <option value="CANCELADO_SOLICITANTE">Cancelado por el solicitante</option>
              </select>
            </div>
          ) : null}
          {movimiento && (movimiento.requiresComment || movimientoCierra(movimiento)) ? (
            <div className="grid gap-1">
              <Label htmlFor="motivo-tablero">Motivo</Label>
              <Textarea id="motivo-tablero" value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={3} />
            </div>
          ) : null}
          {movimiento?.requiresDelivery ? (
            <div className="grid gap-1">
              <Label htmlFor="entrega-tablero">Enlace de la entrega</Label>
              <Input id="entrega-tablero" value={entrega} onChange={(event) => setEntrega(event.target.value)} placeholder="https://" />
              <p className="text-xs text-muted-foreground">Si el requerimiento ya tiene un adjunto, puede dejar el enlace vacío.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogo(null)}>Cancelar</Button>
            <Button
              type="button"
              disabled={pending || !movimiento}
              onClick={() => { if (dialogo && movimiento) ejecutar(dialogo.code, movimiento, motivo, entrega) }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
