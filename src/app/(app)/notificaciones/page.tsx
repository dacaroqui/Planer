import Link from "next/link"
import { marcarAvisoAction, marcarAvisosAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"
import { requireActor } from "@/server/session"
import { listarAvisos } from "@/server/requests"

export default async function AvisosPage() {
  const actor = await requireActor()
  const { items, unread } = await listarAvisos(actor)
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl">Avisos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread === 0 ? "No tiene avisos sin leer." : `${unread} sin leer. El correo de asignación solo sale si el servidor tiene SMTP configurado.`}
          </p>
        </div>
        {unread > 0 ? (
          <form action={marcarAvisosAction}>
            <Button type="submit" variant="outline">Marcar todo como leído</Button>
          </form>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Cuando le asignen un requerimiento, lo comenten o cambie de estado, el aviso queda aquí.
        </p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className={`rounded-xl border border-border bg-card px-4 py-3 ${item.readAt ? "opacity-70" : ""}`}>
              <p className="font-medium">{item.href ? <Link href={item.href}>{item.subject}</Link> : item.subject}</p>
              {item.body && item.body !== item.subject ? <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{item.body}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(item.createdAt)}
                {item.request ? (
                  <>
                    {" · "}
                    <Link className="underline" href={`/requerimientos/${item.request.code}`}>{item.request.code}</Link>
                  </>
                ) : null}
                {!item.readAt ? (
                  <form action={marcarAvisoAction} className="inline">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="ml-2 underline" type="submit">Marcar leído</button>
                  </form>
                ) : null}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
