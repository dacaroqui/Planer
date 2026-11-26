/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock("@/server/objetivos-actions", () => ({
  editarCampoKpiAction: vi.fn(),
  eliminarKpiAction: vi.fn(),
}))

import { EditorLinea } from "@/components/editor-linea"
import { AltaKpi, KpiInline } from "@/components/kpi-inline"

afterEach(() => cleanup())

const kpi = {
  id: "kpi-1",
  nombre: "Asistencias",
  unidad: "sesiones",
  actual: null,
  meta: null,
  estado: "EN_LINEA_BASE" as const,
  actividades: 2,
}

describe("editor en línea", () => {
  it("abre el campo con palomita y X y cancela con Escape", () => {
    render(<EditorLinea valor="Asistencias" etiqueta="Nombre" puedeEditar onGuardar={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar Nombre" }))
    expect(screen.getByRole("button", { name: "Guardar Nombre" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancelar Nombre" })).toBeTruthy()
    fireEvent.keyDown(screen.getByLabelText("Nombre"), { key: "Escape" })
    expect(screen.queryByRole("button", { name: "Guardar Nombre" })).toBeNull()
  })

  it("la fila de alta guarda con Enter", async () => {
    const crear = vi.fn().mockResolvedValue({ ok: true })
    render(<AltaKpi onCrear={crear} />)
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar KPI" }))
    const campo = screen.getByLabelText("Nuevo KPI")
    fireEvent.change(campo, { target: { value: "Retención" } })
    fireEvent.keyDown(campo, { key: "Enter" })
    expect(crear).toHaveBeenCalledWith("Retención")
  })

  it("el popover dice cuántas actividades están vinculadas", () => {
    render(<KpiInline kpi={kpi} puedeEditar puedeMeta />)
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Asistencias" }))
    expect(screen.getByRole("dialog", { name: "Confirmar eliminación" }).textContent).toContain("2 actividades vinculadas")
  })
})
