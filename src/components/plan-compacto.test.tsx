/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { FilaPlan } from "@/lib/plan-trabajo"

const guardarCeldaAction = vi.fn()

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const reordenarPlanAction = vi.fn()
const crearKpiPlanAction = vi.fn()
const eliminarActividadPlanAction = vi.fn()

vi.mock("@/server/plan-actions", () => ({
  crearActividadAction: vi.fn(),
  crearEntregableAction: vi.fn(),
  renombrarEntregableAction: vi.fn(),
  asignarEntregableAction: vi.fn(),
  vincularKpiAction: vi.fn(),
  moverActividadAction: vi.fn(),
  reordenarPlanAction: (...args: unknown[]) => reordenarPlanAction(...args),
  crearKpiPlanAction: (...args: unknown[]) => crearKpiPlanAction(...args),
  eliminarActividadPlanAction: (...args: unknown[]) => eliminarActividadPlanAction(...args),
  restaurarActividadPlanAction: vi.fn(),
  guardarCeldaAction: (...args: unknown[]) => guardarCeldaAction(...args),
}))

import { toast } from "sonner"
import { PlanCompacto } from "@/components/plan-compacto"

afterEach(() => {
  cleanup()
  guardarCeldaAction.mockReset()
})

function fila(estado: FilaPlan["estado"], id = "t1"): FilaPlan {
  return {
    id,
    proyectoId: "p1",
    proyecto: "Escuela de ejemplo",
    area: "Marketing",
    team: "MARKETING",
    actividad: id === "t1" ? "Parrilla" : "Subtarea",
    responsableId: null,
    responsable: "Sin asignar",
    participantes: [],
    estado,
    bloqueo: "",
    notaRol: "",
    inicio: null,
    fin: "2026-12-20",
    inicioProyecto: "2026-11-01",
    finProyecto: "2026-12-31",
    horasEstimadas: null,
    horasReales: null,
    kpiNombre: "",
    kpiMeta: null,
    kpiUnidad: "",
    kpiActual: null,
    entregableId: null,
    parentId: null,
    orden: 0,
    puedeEditar: true,
    puedeRegistrar: false,
  }
}

function renderPlan(estado: FilaPlan["estado"]) {
  render(
    <PlanCompacto
      filas={[fila(estado)]}
      proyectos={[{ id: "p1", name: "Escuela de ejemplo", team: "MARKETING", area: "Marketing", inicio: "2026-11-01", fin: "2026-12-31" }]}
      entregables={[]}
      enfocar={null}
      onDetalles={() => undefined}
    />,
  )
}

describe("estado de la actividad", () => {
  it("abre el popover y marca hecha desde pendiente en un clic", async () => {
    guardarCeldaAction.mockResolvedValue({ ok: true })
    renderPlan("PENDIENTE")
    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }))
    expect(screen.getByRole("menu", { name: "Estado de Parrilla" })).toBeTruthy()
    fireEvent.click(screen.getByRole("menuitem", { name: "Hecha" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", status: "HECHA" })
    expect(screen.getByRole("button", { name: "Hecha" })).toBeTruthy()
    expect(screen.getAllByLabelText("Avance 100%").length).toBeGreaterThan(0)
  })

  it("la palomita pasa de pendiente a hecha y de hecha a pendiente", async () => {
    guardarCeldaAction.mockResolvedValue({ ok: true })
    renderPlan("PENDIENTE")
    fireEvent.click(screen.getByRole("button", { name: "Marcar hecha Parrilla" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", status: "HECHA" })
    cleanup()
    guardarCeldaAction.mockClear()
    renderPlan("HECHA")
    fireEvent.click(screen.getByRole("button", { name: "Volver a pendiente Parrilla" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", status: "PENDIENTE" })
    expect(screen.getByRole("button", { name: "Pendiente" })).toBeTruthy()
  })

  it("desde en curso el popover elige hecha y un error vuelve atrás con aviso", async () => {
    guardarCeldaAction.mockResolvedValue({ ok: false, error: "No se pudo guardar." })
    renderPlan("EN_CURSO")
    fireEvent.click(screen.getByRole("button", { name: "En curso" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Hecha" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", status: "HECHA" })
    await waitFor(() => expect(screen.getByRole("button", { name: "En curso" })).toBeTruthy())
    expect(toast.error).toHaveBeenCalledWith("No se pudo guardar.")
    fireEvent.click(screen.getByRole("button", { name: "En curso" }))
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("crea un KPI desde el selector, fija y quita la fecha, asigna y elimina", async () => {
    guardarCeldaAction.mockResolvedValue({ ok: true })
    reordenarPlanAction.mockResolvedValue({ ok: true })
    crearKpiPlanAction.mockResolvedValue({ ok: true, kpi: { id: "k1", nombre: "Tasa de ejemplo", unidad: "sesiones", meta: null, actual: null, origen: "area" } })
    eliminarActividadPlanAction.mockResolvedValue({ ok: true, foto: { id: "t1" }, hijas: [] })
    render(
      <PlanCompacto
        filas={[fila("PENDIENTE"), { ...fila("PENDIENTE", "t2"), actividad: "Edición", parentId: null }]}
        proyectos={[{ id: "p1", name: "Escuela de ejemplo", team: "MARKETING", area: "Marketing", inicio: "2026-11-01", fin: "2026-12-31" }]}
        entregables={[]}
        responsables={[{ id: "u1", name: "Valeria Ejemplo", teams: ["MARKETING"] }]}
        enfocar={null}
        onDetalles={() => undefined}
      />,
    )
    fireEvent.click(screen.getAllByRole("button", { name: "Elegir KPI" })[0])
    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo KPI" }))
    fireEvent.change(screen.getByLabelText("Nombre del KPI nuevo"), { target: { value: "Tasa de ejemplo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar KPI nuevo" }))
    expect(crearKpiPlanAction).toHaveBeenCalledWith({ tareaId: "t1", nombre: "Tasa de ejemplo", meta: "", unidad: "" })
    fireEvent.click(screen.getAllByRole("button", { name: "Inicio" })[0])
    expect(screen.getByLabelText("Elegir inicio")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Elegir inicio"), { target: { value: "2026-12-01" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar inicio" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", fechaInicio: "2026-12-01" })
    fireEvent.click(screen.getAllByRole("button", { name: "Inicio" })[0])
    fireEvent.click(screen.getByRole("button", { name: "Quitar inicio" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", fechaInicio: null })
    fireEvent.click(screen.getAllByRole("button", { name: "Responsable Sin asignar" })[0])
    fireEvent.click(screen.getByRole("button", { name: "Valeria Ejemplo" }))
    expect(guardarCeldaAction).toHaveBeenCalledWith({ id: "t1", assigneeId: "u1" })
    fireEvent.keyDown(screen.getByRole("button", { name: "Arrastrar Edición" }), { key: "ArrowUp" })
    expect(reordenarPlanAction).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Parrilla" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminar" }))
    expect(eliminarActividadPlanAction).toHaveBeenCalledWith({ id: "t1", subtareas: "soltar" })
  })
})
