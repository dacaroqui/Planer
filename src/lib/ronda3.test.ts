import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { relacionesListar } from "@/server/requests"

describe("lista liviana", () => {
  it("carga pausas para el SLA y tareas solo cuando se piden", () => {
    expect(relacionesListar({})).toEqual({ pauses: true, tasks: false })
    expect(relacionesListar({ conPausas: false })).toEqual({ pauses: false, tasks: false })
    expect(relacionesListar({ conPausas: true, conTareas: true })).toEqual({ pauses: true, tasks: true })
  })
})

describe("tablero del espacio", () => {
  it("deja visible el chip, la lozenge, + Crear y la pestaña Páginas con icono", () => {
    const tablero = readFileSync("src/components/tablero-espacio.tsx", "utf8")
    const pestanas = readFileSync("src/components/pestanas-espacio.tsx", "utf8")
    expect(tablero.match(/Necesita información/g)?.length).toBeGreaterThanOrEqual(2)
    expect(tablero).toContain("+ Crear")
    expect(tablero).not.toContain("Alta o crítica")
    expect(tablero).not.toContain("Mis asignaciones")
    expect(pestanas).toContain('label: "Páginas"')
    expect(pestanas).toContain("StickyNoteIcon")
    expect(pestanas).toContain("<Icon")
  })
})

describe("región y streaming", () => {
  it("fija pdx1, conserva el cron y no bloquea el cascarón en opcionesVisibles", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { regions: string[]; crons: { path: string }[] }
    expect(vercel.regions).toEqual(["pdx1"])
    expect(vercel.crons[0]?.path).toBe("/api/cron/sla")
    const layout = readFileSync("src/app/(app)/layout.tsx", "utf8")
    expect(layout).toContain("catalogoPara")
    expect(layout).toContain("<Suspense")
    expect(layout).not.toContain("opcionesVisibles")
    const lista = readFileSync("src/app/(app)/requerimientos/page.tsx", "utf8")
    const tablero = readFileSync("src/app/(app)/tablero/page.tsx", "utf8")
    expect(lista).not.toContain("opcionesVisibles")
    expect(tablero).not.toContain("opcionesTablero")
    expect(lista).toContain("<Suspense")
    expect(tablero).toContain("<Suspense")
  })

  it("agrega índices sin borrar columnas", () => {
    const sql = readFileSync("prisma/migrations/20261117220000_indices_lista/migration.sql", "utf8")
    expect(sql).toContain('"Request_updatedAt_idx"')
    expect(sql).toContain('"Request_areaId_idx"')
    expect(sql).toContain('"Request_resolvedAt_idx"')
    expect(sql).toContain('"Request_team_status_updatedAt_idx"')
    expect(sql.toLowerCase()).not.toContain("drop ")
    expect(sql.toLowerCase()).not.toContain("alter table")
  })
})
