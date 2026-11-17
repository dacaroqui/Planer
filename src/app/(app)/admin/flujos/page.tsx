import { redirect } from "next/navigation"
import { guardarEstadoAction, guardarSlaAction, guardarTransicionAction } from "@/server/actions"
import { EliminarEstado } from "@/components/eliminar-estado"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PRIORITY_LABEL, type PriorityName } from "@/lib/domain"
import { puedeAdministrar } from "@/lib/permissions"
import { requireActor } from "@/server/session"
import { catalogos } from "@/server/requests"

export default async function FlujosPage() {
  const actor = await requireActor()
  if (!puedeAdministrar(actor)) redirect("/panel")
  const data = await catalogos()
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl">Flujos y SLA</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tabla de estados, transiciones y metas. No hay editor gráfico. Un cambio de SLA no altera los requerimientos ya radicados.
        </p>
      </div>
      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Estados</h2>
        {data.estados.map((estado) => (
          <EliminarEstado key={estado.id} id={estado.id} nombre={`${estado.team === "DESARROLLO" ? "Desarrollo" : "Marketing"} · ${estado.name}`} />
        ))}
        <form action={guardarEstadoAction} className="grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
          <select name="team" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Área">
            <option value="DESARROLLO">Desarrollo</option>
            <option value="MARKETING">Marketing</option>
          </select>
          <Input name="key" placeholder="CLAVE" required />
          <Input name="name" placeholder="Nombre visible" required />
          <Input name="boardColumn" placeholder="Columna del tablero" required />
          <select name="category" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Categoría">
            <option value="POR_HACER">Por hacer</option>
            <option value="EN_CURSO">En curso</option>
            <option value="TERMINADO">Terminado</option>
          </select>
          <Button type="submit">Agregar estado</Button>
        </form>
      </section>
      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Transiciones</h2>
        {data.transiciones.map((item) => (
          <p key={item.id} className="text-sm">{item.team === "DESARROLLO" ? "Desarrollo" : "Marketing"} · {item.name}: {item.fromKeys} → {item.toKey} · {item.allowedRoles}</p>
        ))}
        <form action={guardarTransicionAction} className="grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <select name="team" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Área">
            <option value="DESARROLLO">Desarrollo</option>
            <option value="MARKETING">Marketing</option>
          </select>
          <Input name="name" placeholder="Nombre de la transición" required />
          <Input name="fromKeys" placeholder="Origen, separado por comas" required />
          <Input name="toKey" placeholder="Destino" required />
          <Input name="allowedRoles" placeholder="LIDER,RESPONSABLE,SOLICITANTE,QA" required />
          <select name="slaEffect" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Efecto en el SLA">
            <option value="NONE">Sin efecto</option>
            <option value="STOP_FIRST">Detiene primera respuesta</option>
            <option value="PAUSE">Pausa</option>
            <option value="RESUME">Reanuda</option>
            <option value="STOP">Detiene solución</option>
            <option value="NEW_CYCLE">Nuevo ciclo</option>
          </select>
          <label className="text-sm"><input type="checkbox" name="requiresComment" value="1" /> Motivo obligatorio</label>
          <label className="text-sm"><input type="checkbox" name="requiresAssignee" value="1" /> Exige responsable</label>
          <label className="text-sm"><input type="checkbox" name="requiresCommittedDate" value="1" /> Exige fecha comprometida</label>
          <label className="text-sm"><input type="checkbox" name="requiresDelivery" value="1" /> Exige enlace o adjunto</label>
          <Button type="submit">Agregar transición</Button>
        </form>
      </section>
      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Metas de SLA</h2>
        {data.politicas.map((item) => (
          <p key={item.id} className="text-sm">
            {item.team === "DESARROLLO" ? "Desarrollo" : "Marketing"} · {PRIORITY_LABEL[item.priority as PriorityName] ?? item.priority}
            {item.type ? ` · ${item.type.name}` : " · cualquier tipo"} · primera respuesta {item.firstResponseMinutes / 60} h · solución {item.resolutionMinutes / 60} h
          </p>
        ))}
        <form action={guardarSlaAction} className="grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
          <select name="team" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Área">
            <option value="DESARROLLO">Desarrollo</option>
            <option value="MARKETING">Marketing</option>
          </select>
          <select name="priority" className="h-9 rounded-lg border border-input px-2 text-sm" aria-label="Prioridad">
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
          <Input name="firstHours" type="number" min={1} step="0.5" placeholder="Horas de primera respuesta" required />
          <Input name="resolutionHours" type="number" min={1} step="0.5" placeholder="Horas de solución" required />
          <Button type="submit">Guardar meta</Button>
        </form>
      </section>
    </div>
  )
}