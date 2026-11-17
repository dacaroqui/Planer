import { describe, expect, it } from "vitest"
import { catalogoTablero } from "@/lib/catalogo-tablero"
import { debePedirProyecto, debePedirResponsable, movimientoAlSoltar, movimientoCierra, movimientoExigeDialogo, validarDatosMovimiento, type TarjetaMovible } from "@/lib/tablero-movimiento"

const tarjetas: TarjetaMovible[] = [
  {
    code: "DES-0010",
    moves: [{ name: "Aprobar entrega", column: "Cerrado", to: "CERRADO" }],
  },
  {
    code: "DES-0014",
    moves: [
      { name: "Aprobar entrega", column: "Cerrado", to: "CERRADO" },
      { name: "Devolver", column: "En desarrollo", to: "EN_DESARROLLO", requiresComment: true },
    ],
  },
]

describe("tablero: la tarjeta arrastrada", () => {
  it("usa el código arrastrado y no el de otra tarjeta de la misma columna", () => {
    const decision = movimientoAlSoltar(tarjetas, "DES-0014", "Cerrado")
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.code).toBe("DES-0014")
    expect(decision.moves.map((item) => item.name)).toEqual(["Aprobar entrega"])
    expect(decision.code).not.toBe("DES-0010")
  })

  it("no confirma un movimiento que exige motivo o entrega", () => {
    const entregar = {
      name: "Entregar para validación",
      column: "En validación",
      to: "EN_VALIDACION",
      requiresComment: true,
      requiresDelivery: true,
    }
    expect(movimientoExigeDialogo(entregar)).toBe(true)
    expect(validarDatosMovimiento(entregar, "", "")).toMatch(/motivo/)
    expect(validarDatosMovimiento(entregar, "Listo para revisar.", "")).toBeNull()
    expect(validarDatosMovimiento(tarjetas[1].moves[0], "Cierro con este motivo.", "")).toBeNull()
    expect(validarDatosMovimiento(tarjetas[1].moves[0], "", "")).toMatch(/motivo/)
  })

  it("Enviar a pruebas y Entregar para validación conservan los datos obligatorios", () => {
    const catalogo = catalogoTablero([
      { team: "DESARROLLO", name: "Enviar a pruebas", fromKeys: "EN_DESARROLLO", toKey: "EN_PRUEBAS", allowedRoles: "RESPONSABLE", slaEffect: "NONE", requiresComment: true, requiresDelivery: false, requiresAssignee: false, requiresCommittedDate: false },
      { team: "DESARROLLO", name: "Entregar para validación", fromKeys: "EN_PRUEBAS", toKey: "EN_VALIDACION", allowedRoles: "QA,LIDER", slaEffect: "PAUSE", requiresComment: true, requiresDelivery: true, requiresAssignee: false, requiresCommittedDate: false },
    ])
    expect(catalogo[0].requiresComment).toBe(true)
    expect(catalogo[1].requiresDelivery).toBe(true)
    expect(movimientoExigeDialogo({ name: catalogo[1].name, column: "En validación", to: catalogo[1].to, requiresComment: catalogo[1].requiresComment, requiresDelivery: catalogo[1].requiresDelivery })).toBe(true)
  })

  it("si la empresa exige proyecto, salir de Nuevo abre el diálogo", () => {
    expect(debePedirProyecto({ status: "NUEVO", exigeProyecto: true, projectId: null }, { to: "EN_ANALISIS" })).toBe(true)
    expect(debePedirProyecto({ status: "NUEVO", exigeProyecto: true, projectId: "p1" }, { to: "EN_ANALISIS" })).toBe(false)
    expect(debePedirProyecto({ status: "NUEVO", exigeProyecto: false, projectId: null }, { to: "EN_ANALISIS" })).toBe(false)
  })

  it("no pide responsable si ya está asignado y cerrar abre diálogo", () => {
    const aprobar = { name: "Aprobar", to: "APROBADO", column: "Aprobado / En cola", requiresAssignee: true, requiresCommittedDate: true }
    expect(debePedirResponsable({ assigneeId: "agente" }, aprobar)).toBe(false)
    expect(debePedirResponsable({ assigneeId: null }, aprobar)).toBe(true)
    expect(validarDatosMovimiento(aprobar, "", "", { assigneeId: "agente", committedDate: "2026-11-20" })).toBeNull()
    const cerrar = { name: "Aprobar entrega", to: "CERRADO", column: "Cerrado" }
    expect(movimientoCierra(cerrar)).toBe(true)
    expect(movimientoExigeDialogo(cerrar)).toBe(true)
  })
})
