import Link from "next/link"
import { requireActor } from "@/server/session"

export default async function AyudaPage() {
  const actor = await requireActor()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground"><Link href="/panel" className="underline">Panel</Link> / Ayuda</p>
        <h1 className="mt-2 font-heading text-4xl">Ayuda</h1>
        <p className="mt-2 text-sm text-muted-foreground">Está en la mesa como {actor.role === "ADMINISTRADOR" ? "administrador" : actor.role === "LIDER" ? "líder" : actor.role === "AGENTE" ? "agente" : actor.role === "OBSERVADOR" ? "observador" : "solicitante"}.</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-heading text-2xl">Atajos</h2>
        <ul className="mt-2 grid gap-1">
          <li><kbd>c</kbd> radicar, si su rol puede.</li>
          <li><kbd>/</kbd> buscar por código o título.</li>
          <li><kbd>g</kbd> luego <kbd>b</kbd> tablero. <kbd>g</kbd> luego <kbd>l</kbd> lista.</li>
          <li><kbd>?</kbd> esta ayuda.</li>
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-heading text-2xl">Qué puede hacer</h2>
        <p className="mt-2">Solicitante, agente, líder y administrador radican. El observador solo consulta. Las notas internas las ven agente y líder del área. Un agente no abre el tablero de la otra área.</p>
        <p className="mt-2">El porcentaje de un proyecto promedia el avance de las tareas y el de los requerimientos cerrados. Si hay un requerimiento abierto, no marca 100 %.</p>
        <p className="mt-2">Si una acción pide motivo, enlace o proyecto, se abre un diálogo. Cancelar deja la tarjeta donde estaba. Deshacer aparece unos segundos en el aviso del tablero.</p>
      </section>
    </div>
  )
}
