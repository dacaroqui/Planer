import { prisma } from "@/lib/prisma"
import { DomainError, PermisoDenegado, type Actor } from "@/lib/domain"
import { puedeAvanzar, puedeEditarGrowth, puedeVerGrowth, elegirFuente, type DecisionGrowth, type EstadoGrowth } from "@/lib/growth"

function exigirVer(actor: Actor) {
  if (!puedeVerGrowth(actor)) throw new PermisoDenegado("Growth es solo para el equipo de Growth y los administradores.")
}

function exigirEditar(actor: Actor) {
  exigirVer(actor)
  if (!puedeEditarGrowth(actor)) throw new PermisoDenegado("Su rol en Growth solo puede leer.")
}

export async function listarCiclos(actor: Actor) {
  exigirVer(actor)
  return prisma.growthCiclo.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { experimentos: true } } } })
}

export async function vistaGrowth(actor: Actor, filtros: { brand?: string; cicloId?: string; tab?: string }) {
  exigirVer(actor)
  const ciclos = await prisma.growthCiclo.findMany({ orderBy: { createdAt: "asc" } })
  const ciclo = ciclos.find((item) => item.id === filtros.cicloId) ?? ciclos.find((item) => item.activo) ?? ciclos[0] ?? null
  const brand = filtros.brand && ["CIFES", "LUVANIA", "AMBAS"].includes(filtros.brand) ? filtros.brand : (ciclo?.brand ?? "LUVANIA")
  const embudoRow = ciclo
    ? await prisma.growthEmbudo.findFirst({
        where: { cicloId: ciclo.id, brand },
        include: { etapas: { orderBy: { orden: "asc" } } },
      })
    : null
  const embudo = embudoRow
    ? {
        fuente: embudoRow.fuente,
        updatedAt: embudoRow.updatedAt,
        etapas: embudoRow.etapas.map((etapa) => ({
          nombre: etapa.nombre,
          valor: etapa.valor,
          orden: etapa.orden,
          destacado: etapa.destacado,
          llamada: etapa.llamada,
          subllamada: etapa.subllamada,
          valorPrevio: etapa.valorPrevio,
        })),
      }
    : null
  if (embudoRow?.fuente === "CRM") {
    try {
      await elegirFuente("CRM", embudo).leer()
    } catch {
      // El CRM aún no responde: se muestra la copia manual.
    }
  }
  const experimentos = ciclo
    ? await prisma.growthExperimento.findMany({
        where: { cicloId: ciclo.id },
        include: { owner: { select: { name: true } }, tareas: { select: { status: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    : []
  return { ciclos, ciclo, brand, embudo, ilustrativo: ciclo?.ilustrativo ?? false, reunion: ciclo?.reunion ?? "", experimentos }
}

export async function historialExperimentos(actor: Actor, filtros: { persona?: string; brand?: string; etapa?: string; estado?: string }) {
  exigirVer(actor)
  return prisma.growthExperimento.findMany({
    where: {
      ...(filtros.brand ? { brand: filtros.brand } : {}),
      ...(filtros.etapa ? { etapaEmbudo: filtros.etapa } : {}),
      ...(filtros.estado ? { estado: filtros.estado as EstadoGrowth } : {}),
      ...(filtros.persona ? { OR: [{ ownerName: { contains: filtros.persona, mode: "insensitive" } }, { owner: { name: { contains: filtros.persona, mode: "insensitive" } } }] } : {}),
    },
    include: { owner: { select: { name: true } }, ciclo: { select: { nombre: true } } },
    orderBy: { updatedAt: "desc" },
  })
}

export async function aprendizajes(actor: Actor) {
  exigirVer(actor)
  return prisma.growthExperimento.findMany({
    where: { estado: "CERRADO" },
    include: { owner: { select: { name: true } }, ciclo: { select: { nombre: true } } },
    orderBy: { updatedAt: "desc" },
  })
}

export async function fichaExperimento(actor: Actor, id: string) {
  exigirVer(actor)
  const fila = await prisma.growthExperimento.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      ciclo: true,
      comentarios: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      enlaces: { orderBy: { createdAt: "asc" } },
      tareas: { include: { assignee: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  })
  if (!fila) throw new DomainError("El experimento no existe.")
  return fila
}

export async function crearExperimento(actor: Actor, input: {
  nombre: string
  brand: string
  cicloId: string
  etapaEmbudo: string
  metrica: string
  problema: string
  donde: string
  datos: string
  explicacion: string
  referencia: string
  mecanismo: string
  porque: string
  valorInicial: string
  meta: string
  comparacion: string
  duracion: string
}) {
  exigirEditar(actor)
  if (input.nombre.trim().length < 3) throw new DomainError("Indique el nombre del experimento.")
  return prisma.growthExperimento.create({
    data: {
      nombre: input.nombre.trim(),
      brand: input.brand,
      cicloId: input.cicloId,
      etapaEmbudo: input.etapaEmbudo.trim(),
      metrica: input.metrica.trim(),
      problema: input.problema.trim(),
      donde: input.donde.trim(),
      datos: input.datos.trim(),
      explicacion: input.explicacion.trim(),
      referencia: input.referencia.trim(),
      mecanismo: input.mecanismo.trim(),
      porque: input.porque.trim(),
      valorInicial: input.valorInicial.trim(),
      meta: input.meta.trim(),
      comparacion: input.comparacion.trim(),
      duracion: input.duracion.trim(),
      ownerId: actor.id,
      ownerName: actor.name,
      estado: "BORRADOR",
    },
  })
}

export async function avanzarExperimento(actor: Actor, id: string, decision?: DecisionGrowth | null) {
  exigirEditar(actor)
  const actual = await prisma.growthExperimento.findUnique({ where: { id } })
  if (!actual) throw new DomainError("El experimento no existe.")
  const paso = puedeAvanzar(actual.estado, decision)
  if (!paso.ok) throw new DomainError(paso.error)
  return prisma.growthExperimento.update({
    where: { id },
    data: { estado: paso.destino, decision: paso.destino === "CERRADO" ? decision : actual.decision },
  })
}

export async function comentarExperimento(actor: Actor, id: string, body: string) {
  exigirVer(actor)
  if (!puedeEditarGrowth(actor) && actor.memberships.every((item) => item.team !== "GROWTH" || item.role === "OBSERVADOR") && actor.role !== "ADMINISTRADOR") {
    throw new PermisoDenegado("Su rol en Growth solo puede leer.")
  }
  if (body.trim().length < 2) throw new DomainError("Escriba el comentario.")
  return prisma.growthComentario.create({ data: { experimentoId: id, authorId: actor.id, body: body.trim() } })
}

export async function agregarEnlace(actor: Actor, id: string, titulo: string, url: string) {
  exigirEditar(actor)
  if (!url.startsWith("http")) throw new DomainError("El enlace debe empezar por http.")
  return prisma.growthEnlace.create({ data: { experimentoId: id, titulo: titulo.trim() || url, url } })
}

export async function pendientesDePropuesta(actor: Actor, cicloId: string) {
  exigirVer(actor)
  const presentados = await prisma.growthExperimento.findMany({ where: { cicloId }, select: { ownerId: true, ownerName: true } })
  const nombres = new Set(presentados.map((item) => item.ownerName))
  const miembros = await prisma.areaRole.findMany({
    where: { team: "GROWTH", role: { in: ["LIDER", "AGENTE"] }, user: { active: true } },
    include: { user: { select: { id: true, name: true } } },
  })
  return miembros
    .filter((item) => !presentados.some((fila) => fila.ownerId === item.userId) && !nombres.has(item.user.name))
    .map((item) => item.user.name)
}

export async function resumenGrowth(actor: Actor) {
  if (!puedeVerGrowth(actor)) return null
  const ciclo = await prisma.growthCiclo.findFirst({ where: { activo: true }, orderBy: { createdAt: "desc" } })
  if (!ciclo) return null
  const [activos, pendientes] = await Promise.all([
    prisma.growthExperimento.count({ where: { cicloId: ciclo.id, estado: { in: ["REVISION", "PREPARACION", "EN_EJECUCION", "ANALISIS"] } } }),
    prisma.growthExperimento.count({ where: { cicloId: ciclo.id, estado: "ANALISIS" } }),
  ])
  return { ciclo: ciclo.nombre, activos, pendientes }
}

export async function experimentosDeEmpresa(actor: Actor, empresa: string) {
  if (!puedeVerGrowth(actor)) return []
  const brand = empresa.toLowerCase().includes("luvania") ? "LUVANIA" : empresa.toLowerCase().includes("cifes") ? "CIFES" : null
  if (!brand) return []
  return prisma.growthExperimento.findMany({
    where: { brand },
    include: { owner: { select: { name: true } }, ciclo: { select: { nombre: true } } },
    orderBy: { updatedAt: "desc" },
    take: 8,
  })
}

export async function experimentosParaTi(actor: Actor) {
  if (!puedeVerGrowth(actor)) return []
  return prisma.growthExperimento.findMany({
    where: { OR: [{ ownerId: actor.id }, { tareas: { some: { assigneeId: actor.id } } }] },
    include: { ciclo: { select: { nombre: true } }, tareas: { where: { assigneeId: actor.id }, select: { id: true, title: true, status: true, updatedAt: true } } },
    orderBy: { updatedAt: "desc" },
    take: 8,
  })
}
