import { describe, expect, it } from "vitest"
import { DateTime } from "luxon"
import type { Actor } from "@/lib/domain"
import {
  alcanceRendimiento,
  aplicarSeleccion,
  armarTablero,
  chipsRendimiento,
  filasACsv,
  filtrosLimpios,
  hrefRendimiento,
  instanteDeCorte,
  leerFiltros,
  mediana,
  personasPermitidas,
  rangoPeriodo,
  serieTendencia,
  type FilaRendimiento,
  type FiltrosRendimiento,
  type PersonaCandidata,
  type PersonaRendimiento,
  type SolicitudMedible,
} from "@/lib/rendimiento"
import { snapshotSolucion } from "@/lib/sla-solicitud"
import { evaluarSla } from "@/server/requests"
import { ZONE } from "@/lib/time"

const bogota = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toJSDate()

function actor(partial: Partial<Actor> & Pick<Actor, "id" | "role">): Actor {
  return {
    id: partial.id,
    email: partial.email ?? `${partial.id}@cifes.edu.co`,
    name: partial.name ?? partial.id,
    role: partial.role,
    team: partial.team ?? partial.memberships?.[0]?.team ?? null,
    areaId: partial.areaId ?? "area",
    active: partial.active ?? true,
    isAdmin: partial.isAdmin ?? partial.role === "ADMINISTRADOR",
    memberships: partial.memberships ?? [],
  }
}

const persona: PersonaRendimiento = {
  id: "p1",
  nombre: "Valentina Ejemplo",
  email: "valentina.ejemplo@cifes.edu.co",
  areaId: "area",
  area: "Tecnología",
  equipos: "Desarrollo",
}

function solicitud(partial: Partial<SolicitudMedible> & Pick<SolicitudMedible, "slaStartedAt">): SolicitudMedible {
  return {
    id: partial.id ?? "s1",
    code: partial.code ?? "DES-0001",
    title: partial.title ?? "Caso de prueba",
    assigneeId: partial.assigneeId ?? persona.id,
    status: partial.status ?? "CERRADO",
    priority: partial.priority ?? "MEDIA",
    slaStartedAt: partial.slaStartedAt,
    slaTargetMinutes: partial.slaTargetMinutes ?? 480,
    resolutionMinutes: partial.resolutionMinutes ?? partial.slaTargetMinutes ?? 480,
    resolvedAt: partial.resolvedAt === undefined ? partial.slaStartedAt : partial.resolvedAt,
    createdAt: partial.createdAt ?? partial.slaStartedAt,
    pauses: partial.pauses ?? [],
  }
}

function tablero(solicitudes: SolicitudMedible[], now: Date, periodo = rangoPeriodo({ periodo: "mes", now })) {
  return armarTablero({ personas: [persona], solicitudes, tareas: new Map(), periodo, now })
}

describe("periodo en America/Bogota", () => {
  it("abre la semana el lunes a las 00:00 y no el domingo en UTC", () => {
    const miercoles = bogota("2026-11-18T15:00:00")
    const semana = rangoPeriodo({ periodo: "semana", now: miercoles })
    expect(DateTime.fromJSDate(semana.start).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-16 00:00")
    expect(DateTime.fromJSDate(semana.end).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-23 00:00")

    const domingoNocheUtc = new Date("2026-11-16T04:30:00.000Z")
    const anterior = rangoPeriodo({ periodo: "semana", now: domingoNocheUtc })
    expect(DateTime.fromJSDate(anterior.start).setZone(ZONE).toISODate()).toBe("2026-11-09")

    const lunesUtc = new Date("2026-11-16T05:00:00.000Z")
    const actual = rangoPeriodo({ periodo: "semana", now: lunesUtc })
    expect(DateTime.fromJSDate(actual.start).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-16 00:00")
  })

  it("corta el mes y el año en la medianoche de Colombia", () => {
    const finNoviembre = new Date("2026-12-01T04:59:00.000Z")
    const noviembre = rangoPeriodo({ periodo: "mes", now: finNoviembre })
    expect(DateTime.fromJSDate(noviembre.start).setZone(ZONE).toISODate()).toBe("2026-11-01")
    expect(DateTime.fromJSDate(noviembre.end).setZone(ZONE).toISODate()).toBe("2026-12-01")

    const inicioDiciembre = new Date("2026-12-01T05:00:00.000Z")
    expect(DateTime.fromJSDate(rangoPeriodo({ periodo: "mes", now: inicioDiciembre }).start).setZone(ZONE).toISODate()).toBe("2026-12-01")

    const finAno = new Date("2027-01-01T04:59:00.000Z")
    expect(DateTime.fromJSDate(rangoPeriodo({ periodo: "anio", now: finAno }).start).setZone(ZONE).toISODate()).toBe("2026-01-01")
    const anoNuevo = new Date("2027-01-01T05:00:00.000Z")
    expect(DateTime.fromJSDate(rangoPeriodo({ periodo: "anio", now: anoNuevo }).start).setZone(ZONE).toISODate()).toBe("2027-01-01")
  })

  it("incluye el día final del rango y excluye el siguiente", () => {
    const rango = rangoPeriodo({ periodo: "rango", desde: "2026-11-01", hasta: "2026-11-15", now: bogota("2026-11-18T10:00:00") })
    expect(DateTime.fromJSDate(rango.start).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-01 00:00")
    expect(DateTime.fromJSDate(rango.end).setZone(ZONE).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-11-16 00:00")
    const ahora = bogota("2026-11-20T10:00:00")
    const dentro = solicitud({ slaStartedAt: bogota("2026-11-15T23:00:00"), resolvedAt: bogota("2026-11-15T23:30:00"), createdAt: bogota("2026-11-15T08:00:00") })
    const fuera = solicitud({ id: "s2", code: "DES-0002", slaStartedAt: bogota("2026-11-16T00:00:00"), resolvedAt: bogota("2026-11-16T10:00:00"), createdAt: bogota("2026-11-16T00:00:00") })
    const resultado = armarTablero({ personas: [persona], solicitudes: [dentro, fuera], tareas: new Map(), periodo: rango, now: ahora })
    expect(resultado.filas[0].completados).toBe(1)
    expect(resultado.filas[0].asignados).toBe(1)
  })
})

describe("métricas de SLA por persona", () => {
  const ahora = bogota("2026-11-18T15:00:00")
  const periodo = rangoPeriodo({ periodo: "mes", now: ahora })

  it("comparte el cálculo de la ficha y no cuenta la pausa ni el reloj de pared", () => {
    const request = {
      slaStartedAt: bogota("2026-11-09T08:00:00"),
      resolutionMinutes: 12 * 60,
      slaTargetMinutes: 12 * 60,
      pauses: [{ startedAt: bogota("2026-11-10T10:00:00"), endedAt: bogota("2026-11-10T16:00:00") }],
      resolvedAt: bogota("2026-11-10T18:00:00"),
      status: "CERRADO",
    }
    const ficha = evaluarSla(request, ahora)
    const corte = snapshotSolucion(request, ahora)
    expect(corte.snap.state).toBe(ficha.state)
    expect(corte.snap.consumedMinutes).toBeCloseTo(ficha.consumedMinutes, 4)
    expect(ficha.state).toBe("CUMPLIDO")
    expect(ficha.consumedMinutes).toBeCloseTo(12 * 60, 4)

    const conPausa = tablero([solicitud({ ...request, createdAt: request.slaStartedAt })], ahora, periodo)
    expect(conPausa.filas[0].dentroSla).toBe(1)
    expect(conPausa.filas[0].fueraSla).toBe(0)
    expect(conPausa.filas[0].horasPromedio).toBeCloseTo(12, 4)
    expect(conPausa.filas[0].horasPromedio ?? 0).toBeLessThan(20)

    const sinPausa = tablero([solicitud({ ...request, pauses: [], createdAt: request.slaStartedAt })], ahora, periodo)
    expect(sinPausa.filas[0].fueraSla).toBe(1)
    expect(sinPausa.filas[0].horasPromedio).toBeCloseTo(16, 4)
  })

  it("marca tarde, a tiempo y la demora solo de los que se pasaron", () => {
    const tarde = solicitud({
      slaStartedAt: bogota("2026-11-09T08:00:00"),
      createdAt: bogota("2026-11-09T08:00:00"),
      resolvedAt: bogota("2026-11-10T16:00:00"),
      slaTargetMinutes: 8 * 60,
      resolutionMinutes: 8 * 60,
    })
    const resultado = tablero([tarde], ahora, periodo)
    expect(resultado.filas[0].fueraSla).toBe(1)
    expect(resultado.filas[0].completados).toBe(1)
    expect(resultado.filas[0].horasPromedio).toBeCloseTo(14, 4)
    expect(resultado.filas[0].horasDemora).toBeCloseTo(6, 4)
  })

  it("usa horas hábiles y se salta el festivo del 16 de noviembre", () => {
    const cerrado = solicitud({
      slaStartedAt: bogota("2026-11-13T17:00:00"),
      createdAt: bogota("2026-11-13T17:00:00"),
      resolvedAt: bogota("2026-11-17T10:00:00"),
      slaTargetMinutes: 8 * 60,
      resolutionMinutes: 8 * 60,
    })
    const resultado = tablero([cerrado], ahora, periodo)
    expect(resultado.filas[0].dentroSla).toBe(1)
    expect(resultado.filas[0].horasPromedio).toBeCloseTo(3, 4)
  })

  it("cuenta en riesgo solo por encima del 80 %, aunque el motor marque 75 %", () => {
    const base = {
      slaStartedAt: bogota("2026-11-09T08:00:00"),
      createdAt: bogota("2026-11-09T08:00:00"),
      resolvedAt: null,
      status: "EN_DESARROLLO",
      slaTargetMinutes: 8 * 60,
      resolutionMinutes: 8 * 60,
    }
    const bajo = tablero([solicitud(base)], bogota("2026-11-09T16:12:00"), rangoPeriodo({ periodo: "semana", now: bogota("2026-11-09T16:12:00") }))
    const ficha = evaluarSla({ ...base, pauses: [] }, bogota("2026-11-09T16:12:00"))
    expect(ficha.state).toBe("EN_RIESGO")
    expect(bajo.filas[0].enRiesgo).toBe(0)
    expect(bajo.filas[0].dentroSla).toBe(1)
    expect(bajo.filas[0].vencidos).toBe(0)

    const alto = tablero([solicitud(base)], bogota("2026-11-09T16:30:00"), rangoPeriodo({ periodo: "semana", now: bogota("2026-11-09T16:30:00") }))
    expect(alto.filas[0].enRiesgo).toBe(1)
    expect(alto.filas[0].vencidos).toBe(0)
    expect(alto.filas[0].fueraSla).toBe(0)
  })

  it("trata el abierto vencido como fuera de SLA y no como completado", () => {
    const abierto = solicitud({
      slaStartedAt: bogota("2026-11-09T08:00:00"),
      createdAt: bogota("2026-11-09T08:00:00"),
      resolvedAt: null,
      status: "EN_DESARROLLO",
      slaTargetMinutes: 8 * 60,
      resolutionMinutes: 8 * 60,
    })
    const resultado = tablero([abierto], bogota("2026-11-10T12:00:00"), rangoPeriodo({ periodo: "semana", now: bogota("2026-11-10T12:00:00") }))
    expect(resultado.filas[0].completados).toBe(0)
    expect(resultado.filas[0].pendientes).toBe(1)
    expect(resultado.filas[0].vencidos).toBe(1)
    expect(resultado.filas[0].fueraSla).toBe(1)
    expect(resultado.filas[0].enRiesgo).toBe(0)
    expect(resultado.filas[0].horasDemora).toBeCloseTo(4, 4)
  })

  it("no cierra en un periodo un requerimiento que se resolvió después", () => {
    const semana = rangoPeriodo({ periodo: "semana", now: bogota("2026-11-18T15:00:00") })
    const despues = solicitud({
      slaStartedAt: bogota("2026-11-16T08:00:00"),
      createdAt: bogota("2026-11-16T08:00:00"),
      resolvedAt: bogota("2026-11-24T12:00:00"),
      status: "CERRADO",
      slaTargetMinutes: 8 * 60,
      resolutionMinutes: 8 * 60,
    })
    const resultado = armarTablero({ personas: [persona], solicitudes: [despues], tareas: new Map(), periodo: semana, now: bogota("2026-12-01T10:00:00") })
    expect(resultado.filas[0].completados).toBe(0)
    expect(resultado.filas[0].pendientes).toBe(1)
    expect(resultado.filas[0].vencidos).toBe(1)
    expect(instanteDeCorte(semana, bogota("2026-12-01T10:00:00")).getTime()).toBe(semana.end.getTime() - 1)
  })

  it("deja fuera lo resuelto antes del corte, lo rechazado y lo creado al terminar", () => {
    const semana = rangoPeriodo({ periodo: "semana", now: bogota("2026-11-18T15:00:00") })
    const solicitudes = [
      solicitud({ id: "antes", code: "DES-0001", slaStartedAt: bogota("2026-11-10T08:00:00"), createdAt: bogota("2026-11-10T08:00:00"), resolvedAt: bogota("2026-11-15T23:30:00") }),
      solicitud({ id: "lunes", code: "DES-0002", slaStartedAt: bogota("2026-11-16T08:00:00"), createdAt: bogota("2026-11-16T08:00:00"), resolvedAt: new Date("2026-11-16T05:00:00.000Z") }),
      solicitud({ id: "rechazo", code: "DES-0003", status: "RECHAZADO", slaStartedAt: bogota("2026-11-16T08:00:00"), createdAt: bogota("2026-11-16T08:00:00"), resolvedAt: bogota("2026-11-16T12:00:00") }),
      solicitud({ id: "borde", code: "DES-0004", status: "EN_DESARROLLO", slaStartedAt: new Date("2026-11-23T05:00:00.000Z"), createdAt: new Date("2026-11-23T05:00:00.000Z"), resolvedAt: null }),
    ]
    const resultado = armarTablero({ personas: [persona], solicitudes, tareas: new Map(), periodo: semana, now: bogota("2026-11-18T15:00:00") })
    expect(resultado.filas[0].asignados).toBe(1)
    expect(resultado.filas[0].completados).toBe(1)
  })

  it("calcula mediana y cumplimiento del conjunto, no el promedio de promedios", () => {
    expect(mediana([4, 10, 12])).toBe(10)
    expect(mediana([4, 10])).toBe(7)
    const cuatro = solicitud({ id: "a", code: "DES-0001", slaStartedAt: bogota("2026-11-09T08:00:00"), createdAt: bogota("2026-11-09T08:00:00"), resolvedAt: bogota("2026-11-09T12:00:00"), slaTargetMinutes: 480, resolutionMinutes: 480 })
    const ocho = solicitud({ id: "b", code: "DES-0002", slaStartedAt: bogota("2026-11-09T08:00:00"), createdAt: bogota("2026-11-09T08:00:00"), resolvedAt: bogota("2026-11-09T18:00:00"), slaTargetMinutes: 480, resolutionMinutes: 480 })
    const resultado = tablero([cuatro, ocho], ahora, periodo)
    expect(resultado.filas[0].horasPromedio).toBeCloseTo(6, 4)
    expect(resultado.filas[0].horasMediana).toBeCloseTo(6, 4)
    expect(resultado.filas[0].cumplimiento).toBe(100)
    expect(resultado.resumen.horasMediana).toBeCloseTo(6, 4)
  })

  it("agrupa la tendencia en la semana de Colombia", () => {
    const ancla = bogota("2026-11-18T15:00:00")
    const serie = serieTendencia([
      solicitud({ id: "dom", code: "DES-0001", slaStartedAt: bogota("2026-11-13T08:00:00"), createdAt: bogota("2026-11-13T08:00:00"), resolvedAt: new Date("2026-11-16T04:30:00.000Z") }),
      solicitud({ id: "lun", code: "DES-0002", slaStartedAt: bogota("2026-11-16T08:00:00"), createdAt: bogota("2026-11-16T08:00:00"), resolvedAt: new Date("2026-11-16T05:00:00.000Z"), slaTargetMinutes: 480, resolutionMinutes: 480 }),
    ], ancla, "semana", 8)
    const ultima = serie.at(-1)
    const previa = serie.at(-2)
    expect(ultima?.clave).toBe("2026-11-16")
    expect(ultima?.completados).toBe(1)
    expect(previa?.clave).toBe("2026-11-09")
    expect(previa?.completados).toBe(1)
  })
})

describe("permisos del rendimiento", () => {
  const valentina: PersonaCandidata = { id: "val", teams: ["DESARROLLO"], roles: ["AGENTE"] }
  const camila: PersonaCandidata = { id: "cam", teams: ["MARKETING"], roles: ["AGENTE"] }
  const helena: PersonaCandidata = { id: "hel", teams: ["DESARROLLO"], roles: ["LIDER"] }
  const dual: PersonaCandidata = { id: "dual", teams: ["DESARROLLO", "MARKETING"], roles: ["AGENTE"] }
  const adminUser: PersonaCandidata = { id: "adm", teams: [], roles: ["ADMINISTRADOR"] }
  const observador: PersonaCandidata = { id: "obs", teams: ["DESARROLLO"], roles: ["OBSERVADOR"] }
  const gente = [valentina, camila, helena, dual, adminUser, observador]

  it("abre el tablero al administrador y al líder, y solo la fila propia al agente", () => {
    const admin = actor({ id: "adm", role: "ADMINISTRADOR" })
    const lider = actor({ id: "hel", role: "LIDER", memberships: [{ team: "DESARROLLO", role: "LIDER" }] })
    const ambos = actor({ id: "amb", role: "LIDER", memberships: [{ team: "DESARROLLO", role: "LIDER" }, { team: "MARKETING", role: "LIDER" }] })
    const agente = actor({ id: "val", role: "AGENTE", memberships: [{ team: "DESARROLLO", role: "AGENTE" }] })
    const mira = actor({ id: "obs", role: "OBSERVADOR", memberships: [{ team: "DESARROLLO", role: "OBSERVADOR" }] })
    const solicita = actor({ id: "sol", role: "SOLICITANTE" })
    const inactivo = actor({ id: "adm", role: "ADMINISTRADOR", active: false })

    expect(alcanceRendimiento(admin).tipo).toBe("todos")
    expect(alcanceRendimiento(lider)).toEqual({ tipo: "equipos", teams: ["DESARROLLO"] })
    expect(alcanceRendimiento(agente).tipo).toBe("propio")
    expect(alcanceRendimiento(mira).tipo).toBe("ninguno")
    expect(alcanceRendimiento(solicita).tipo).toBe("ninguno")
    expect(alcanceRendimiento(inactivo).tipo).toBe("ninguno")
    expect(alcanceRendimiento(actor({
      id: "mix",
      role: "LIDER",
      memberships: [{ team: "DESARROLLO", role: "LIDER" }, { team: "MARKETING", role: "AGENTE" }],
    })).tipo).toBe("equipos")

    expect(personasPermitidas(admin, gente).map((item) => item.id).sort()).toEqual(["adm", "cam", "dual", "hel", "val"])
    expect(personasPermitidas(lider, gente).map((item) => item.id).sort()).toEqual(["dual", "hel", "val"])
    expect(personasPermitidas(ambos, gente).map((item) => item.id).sort()).toEqual(["cam", "dual", "hel", "val"])
    expect(personasPermitidas(agente, gente).map((item) => item.id)).toEqual(["val"])
    expect(personasPermitidas(mira, gente)).toEqual([])

    const propias = personasPermitidas(agente, gente)
    expect(aplicarSeleccion(alcanceRendimiento(agente), propias, ["cam"]).map((item) => item.id)).toEqual(["val"])
    const delLider = personasPermitidas(lider, gente)
    expect(aplicarSeleccion(alcanceRendimiento(lider), delLider, ["cam"])).toEqual([])
  })

  it("lee persona repetida y no acepta un equipo inventado", () => {
    const filtros = leerFiltros({ periodo: "semana", persona: ["val", "cam"], equipo: "OTRO", prioridad: "ALTA" })
    expect(filtros.periodo).toBe("semana")
    expect(filtros.personas).toEqual(["val", "cam"])
    expect(filtros.equipo).toBeUndefined()
    expect(filtros.prioridad).toBe("ALTA")
  })

  it("arma chips que se quitan sin perder el resto de la consulta", () => {
    const base: FiltrosRendimiento = {
      periodo: "semana",
      personas: ["val", "cam"],
      areaId: "tec",
      empresaId: "cifes",
      equipo: "DESARROLLO",
      tipoId: "bug",
      prioridad: "ALTA",
      orden: "asignados",
      dir: "desc",
    }
    const chips = chipsRendimiento(base, {
      persona: new Map([["val", "Valentina"], ["cam", "Camila"]]),
      area: new Map([["tec", "Tecnología"]]),
      empresa: new Map([["cifes", "CIFES"]]),
      tipo: new Map([["bug", "Error (bug)"]]),
    })
    expect(chips.map((chip) => chip.texto)).toEqual([
      "Periodo: Semana",
      "Persona: Valentina",
      "Persona: Camila",
      "Área: Tecnología",
      "Espacio: CIFES",
      "Equipo: Producto",
      "Tipo: Error (bug)",
      "Prioridad: Alta",
    ])
    const sinCamila = chips.find((chip) => chip.id === "persona-cam")
    expect(hrefRendimiento("/rendimiento/exportar", { ...base, ...sinCamila?.patch })).toContain("persona=val")
    expect(hrefRendimiento("/rendimiento/exportar", { ...base, ...sinCamila?.patch })).not.toContain("persona=cam")
    expect(hrefRendimiento("/rendimiento", { ...base, ...filtrosLimpios() })).toBe("/rendimiento?periodo=mes&orden=asignados&dir=desc")
  })
})

describe("CSV", () => {
  it("escapa fórmulas y comillas", () => {
    const fila = {
      id: "p",
      nombre: '=1+1',
      email: "a@cifes.edu.co",
      area: 'Dice "hola"',
      equipos: "Desarrollo",
      asignados: 1,
      completados: 1,
      pendientes: 0,
      cumplimiento: 100,
      dentroSla: 1,
      fueraSla: 0,
      pctDentroSla: 100,
      horasPromedio: 1.25,
      horasMediana: 1.25,
      horasDemora: null,
      slaAbiertoPromedio: null,
      enRiesgo: 0,
      vencidos: 0,
      tareasSemana: 0,
      tareasMes: 0,
      tareasAnio: 0,
      tareasAsignadas: 2,
      tareasCompletadas: 1,
      tareasSinHacer: 1,
      horasRegistradas: 0,
    } satisfies FilaRendimiento
    const csv = filasACsv([fila])
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain('"Persona"')
    expect(csv).toContain(`"'=1+1"`)
    expect(csv).toContain('"Dice ""hola"""')
    expect(csv).toContain("1.25")
  })
})
