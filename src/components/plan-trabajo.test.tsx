/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/plan",
}))

vi.mock("@/server/plan-actions", () => ({
  crearActividadAction: vi.fn(),
  crearProyectoPlanAction: vi.fn(),
  deshacerAltaAction: vi.fn(),
  editarMasivoAction: vi.fn(),
  guardarCeldaAction: vi.fn(),
  moverActividadAction: vi.fn(),
  reordenarPlanAction: vi.fn(),
}))

import { PlanTrabajo } from "@/components/plan-trabajo"

afterEach(() => cleanup())

describe("alta por proyecto", () => {
  it("abre el formulario con el proyecto de esa fila ya elegido", () => {
    render(
      <PlanTrabajo
        filas={[]}
        proyectos={[{ id: "p-escuela", name: "Escuela de ejemplo", team: "MARKETING", area: "Marketing", inicio: "2026-11-01", fin: "2026-11-30" }]}
        responsables={[]}
        esAdmin={false}
        empresaId="emp"
        equipos={[]}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar actividad" }))
    expect(screen.getByText(/Proyecto:/).textContent).toContain("Escuela de ejemplo")
    expect(screen.queryByLabelText("Proyecto de la actividad")).toBeNull()
    expect(screen.getByLabelText("Título de la actividad")).toBeTruthy()
  })
})
