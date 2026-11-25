import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { filtrarPlan, parsearTituloPlan, presentarTarea, transicionTareaValida, type FilaPlan } from "@/lib/plan-trabajo"
import { filasExportables, libroXlsx } from "@/lib/xlsx-minimo"

describe("plan de trabajo", () => {
  it("saca participantes, bloqueo y rol del título y deja la actividad limpia", () => {
    const parsed = parsearTituloPlan("Creación de plan de contenidos para escuela. — Rol en Excel: David y Edwin — Participantes: David, Edwin — Bloqueo: Necesitamos el guion")
    expect(parsed.titulo).toBe("Creación de plan de contenidos para escuela.")
    expect(parsed.participantes).toEqual(["David", "Edwin"])
    expect(parsed.bloqueo).toBe("Necesitamos el guion")
    expect(parsed.notaRol).toBe("David y Edwin")
    expect(parsearTituloPlan(parsed.titulo).titulo).toBe(parsed.titulo)
  })

  it("prefiere las columnas cuando ya existen y si no, lee el sufijo", () => {
    const base = {
      id: "t1",
      status: "PENDIENTE" as const,
      dueDate: null,
      assigneeId: null,
      assigneeName: null,
      proyectoId: "p1",
      proyecto: "Escuela Cifes",
      team: "MARKETING" as const,
      description: "Área: Marketing",
      fechaInicio: null,
      puedeEditar: false,
      puedeRegistrar: false,
    }
    const desdeTitulo = presentarTarea({
      ...base,
      title: "Parrilla mensual — Participantes: Valeria — Bloqueo: Aviso",
      participantes: null,
      bloqueo: null,
      notaRol: null,
    })
    expect(desdeTitulo.actividad).toBe("Parrilla mensual")
    expect(desdeTitulo.participantes).toEqual(["Valeria"])
    expect(desdeTitulo.bloqueo).toBe("Aviso")
    const guardado = presentarTarea({
      ...base,
      title: "Parrilla mensual — Participantes: Valeria",
      participantes: "Fernando, Miguel",
      bloqueo: "Grabaciones",
      notaRol: "Fernando",
    })
    expect(guardado.participantes).toEqual(["Fernando", "Miguel"])
    expect(guardado.bloqueo).toBe("Grabaciones")
    expect(guardado.actividad).toBe("Parrilla mensual")
  })

  it("filtra por área, persona, estado, proyecto, sin asignar y bloqueo", () => {
    const filas: FilaPlan[] = [
      fila("a", "Escuela Cifes", "MARKETING", "Marketing", "Parrilla", null, [], "PENDIENTE", ""),
      fila("b", "Escuela Cifes", "MARKETING", "Marketing", "Edición", "u1", ["Valeria"], "EN_CURSO", "Aviso"),
      fila("c", "Dashboard", "DESARROLLO", "Producto", "Repo", null, ["Fernando"], "PENDIENTE", ""),
    ]
    expect(filtrarPlan(filas, { area: "MARKETING" }).map((item) => item.id)).toEqual(["a", "b"])
    expect(filtrarPlan(filas, { persona: "valeria" }).map((item) => item.id)).toEqual(["b"])
    expect(filtrarPlan(filas, { persona: "Sin asignar" }).map((item) => item.id)).toEqual(["a", "c"])
    expect(filtrarPlan(filas, { estado: "EN_CURSO" }).map((item) => item.id)).toEqual(["b"])
    expect(filtrarPlan(filas, { proyecto: "p-b" }).map((item) => item.id)).toEqual(["b"])
    expect(filtrarPlan(filas, { sinAsignar: true }).map((item) => item.id)).toEqual(["a", "c"])
    expect(filtrarPlan(filas, { bloqueadas: true }).map((item) => item.id)).toEqual(["b"])
    expect(filtrarPlan(filas, { q: "repo" }).map((item) => item.id)).toEqual(["c"])
    expect(transicionTareaValida("PENDIENTE", "HECHA")).toBe(false)
    expect(transicionTareaValida("PENDIENTE", "EN_CURSO")).toBe(true)
    expect(transicionTareaValida("HECHA", "EN_CURSO")).toBe(true)
  })

  it("arma un xlsx con las mismas columnas", () => {
    const libro = libroXlsx(filasExportables([{
      proyecto: "Escuela Cifes",
      area: "Marketing",
      actividad: "Parrilla mensual",
      responsable: "Sin asignar",
      participantes: ["Valeria"],
      estado: "Pendiente",
      bloqueo: "",
      inicio: "2026-11-01",
      fin: "2026-11-30",
      horasEstimadas: "8",
      horasReales: "3",
      kpi: "1 / 4 piezas",
    }]))
    const texto = libro.toString("utf8")
    expect(libro.subarray(0, 2).toString()).toBe("PK")
    expect(texto).toContain("Parrilla mensual")
    expect(texto).toContain("Participantes")
    expect(texto).toContain("Horas est.")
    expect(texto).toContain("1 / 4 piezas")
  })
})

function fila(
  id: string,
  proyecto: string,
  team: string,
  area: string,
  actividad: string,
  responsableId: string | null,
  participantes: string[],
  estado: FilaPlan["estado"],
  bloqueo: string,
): FilaPlan {
  return {
    id,
    proyectoId: `p-${id}`,
    proyecto,
    area,
    team,
    actividad,
    responsableId,
    responsable: responsableId ? "Alguien" : "Sin asignar",
    participantes,
    estado,
    bloqueo,
    notaRol: "",
    parentId: null,
    orden: 0,
    inicio: null,
    fin: null,
    inicioProyecto: null,
    finProyecto: null,
    horasEstimadas: null,
    horasReales: null,
    kpiNombre: "",
    kpiMeta: null,
    kpiUnidad: "",
    kpiActual: null,
    puedeEditar: false,
    puedeRegistrar: false,
  }
}

describe("migración de fechas y KPI", () => {
  it("solo agrega columnas opcionales", () => {
    const sql = readFileSync("prisma/migrations/20261125190000_tarea_fechas_kpi/migration.sql", "utf8")
    for (const columna of ["fechaInicio", "kpiNombre", "kpiMeta", "kpiUnidad", "kpiActual"]) {
      expect(sql).toContain(`ADD COLUMN "${columna}"`)
    }
    expect(sql.toLowerCase()).not.toContain("drop ")
    expect(sql.toLowerCase()).not.toContain("update ")
  })

  it("agrega orden y lo rellena con la fecha de inicio sin borrar filas", () => {
    const sql = readFileSync("prisma/migrations/20261125233000_tarea_orden/migration.sql", "utf8")
    expect(sql).toContain('ADD COLUMN "orden"')
    expect(sql).toContain("fechaInicio")
    expect(sql).toContain("createdAt")
    expect(sql.toLowerCase()).not.toContain("drop ")
    expect(sql.toLowerCase()).not.toContain("delete ")
  })
})
