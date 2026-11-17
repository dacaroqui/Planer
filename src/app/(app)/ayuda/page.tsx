import Link from "next/link"
import { requireActor } from "@/server/session"
import type { Actor } from "@/lib/domain"

const COMUN = [
  ["?", "Abre la lista de atajos. Desde ahí llega a esta ayuda."],
  ["/", "Busca por código o título."],
  ["Esc", "Cierra la lista de atajos."],
]

function bloques(actor: Actor) {
  if (actor.role === "ADMINISTRADOR") {
    return {
      titulo: "Administrador",
      menu: ["Inicio", "Proyectos", "Planner", "Requerimientos", "Mis solicitudes", "Radicar", "Cola de entrada", "Tablero", "Panel de gestión", "Avisos", "Usuarios", "Catálogos", "Flujos y SLA"],
      puede: ["Ve todos los requerimientos y empresas.", "Radica, clasifica, asigna y cierra.", "Configura usuarios, catálogos, flujos y SLA.", "Descarga adjuntos de cualquier caso."],
      tareas: ["Revise la cola de entrada.", "Ajuste un flujo antes de que lleguen casos nuevos.", "Invite a quien falta y confirme su rol."],
    }
  }
  if (actor.role === "LIDER") {
    return {
      titulo: "Líder",
      menu: ["Inicio", "Proyectos", "Planner", "Requerimientos", "Mis solicitudes", "Radicar", "Cola de entrada", "Tablero", "Panel de gestión", "Avisos"],
      puede: ["Ve los requerimientos de su área.", "Radica, clasifica, asigna y mueve el flujo.", "Aprueba o devuelve cuando el flujo se lo permite.", "No configura usuarios ni flujos."],
      tareas: ["Saque de Nuevo lo que llegó a la cola.", "Asigne responsable y fecha antes de aprobar.", "Mire el semáforo de su área en el panel de gestión."],
    }
  }
  if (actor.role === "AGENTE") {
    return {
      titulo: "Agente",
      menu: ["Inicio", "Proyectos", "Planner", "Requerimientos", "Mis solicitudes", "Radicar", "Tablero", "Panel de gestión", "Avisos"],
      puede: ["Ve los requerimientos de su área.", "Radica y trabaja lo que tiene asignado.", "No clasifica la cola ni cambia flujos.", "En Planner solo aparecen empresas y personas de su visibilidad."],
      tareas: ["Abra el tablero de su área.", "Mueva la tarjeta cuando el flujo se lo permita.", "Deje la entrega con enlace o adjunto antes de pedir validación."],
    }
  }
  if (actor.role === "OBSERVADOR") {
    return {
      titulo: "Observador",
      menu: ["Inicio", "Proyectos", "Requerimientos", "Mis solicitudes", "Tablero", "Panel de gestión", "Avisos"],
      puede: ["Consulta los requerimientos de las áreas donde es observador.", "No radica, no asigna y no cambia el estado.", "No abre Planner."],
      tareas: ["Revise el panel de gestión.", "Filtre la lista por empresa o proyecto.", "Abra un caso para leer el historial, sin modificarlo."],
    }
  }
  return {
    titulo: "Solicitante",
    menu: ["Inicio", "Proyectos", "Requerimientos", "Mis solicitudes", "Radicar", "Avisos"],
    puede: ["Ve solo sus requerimientos.", "Radica y responde cuando le piden información.", "Aprueba o devuelve la entrega de lo suyo, si el flujo lo pide.", "No ve Planner, ni la cola, ni nombres de otros solicitantes en los filtros."],
    tareas: ["Radique con la declaración de datos personales.", "Siga el código en Mis solicitudes.", "Cuando la entrega esté lista, apruebe o pida un ajuste."],
  }
}

export default async function AyudaPage() {
  const actor = await requireActor()
  const rol = bloques(actor)
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-4xl">Ayuda</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta página es para su rol: {rol.titulo}.</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-heading text-2xl">Su menú</h2>
        <p className="mt-2">{rol.menu.join(" · ")}</p>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-heading text-2xl">Qué puede hacer</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {rol.puede.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-heading text-2xl">Tareas típicas</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {rol.tareas.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-heading text-2xl">Atajos</h2>
        <ul className="mt-2 grid gap-1">
          {COMUN.map(([tecla, texto]) => <li key={tecla}><kbd>{tecla}</kbd> {texto}</li>)}
          {actor.role !== "OBSERVADOR" ? <li><kbd>c</kbd> radicar.</li> : null}
          <li><kbd>g</kbd> luego <kbd>i</kbd> inicio, <kbd>l</kbd> lista, <kbd>b</kbd> tablero, <kbd>p</kbd> Planner, <kbd>h</kbd> esta ayuda.</li>
        </ul>
        <p className="mt-3">El porcentaje de un proyecto promedia el avance de las tareas y el de los requerimientos cerrados. Si hay un requerimiento abierto, no marca 100 %.</p>
        <p className="mt-2"><Link href="/panel" className="underline">Volver al inicio</Link></p>
      </section>
    </div>
  )
}
