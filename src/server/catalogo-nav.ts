import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { Actor } from "@/lib/domain"
import { esAdmin } from "@/lib/permissions"

const tablas = unstable_cache(async () => {
  const [empresas, areas, proyectos, tipos] = await prisma.$transaction([
    prisma.empresa.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.area.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.proyecto.findMany({ select: { id: true, name: true, empresaId: true }, orderBy: { name: "asc" } }),
    prisma.requestType.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])
  return { empresas, areas, proyectos, tipos }
}, ["planer-catalogo-tablas"], { revalidate: 60 })

export const catalogoPara = cache(async (actor: Actor) => {
  const base = await tablas()
  const equipos = [...new Set(actor.memberships.map((item) => item.team))]
  const vinculos = esAdmin(actor)
    ? []
    : await prisma.usuarioEmpresa.findMany({ where: { userId: actor.id }, select: { empresaId: true } })
  const empresas = !esAdmin(actor) && vinculos.length > 0
    ? base.empresas.filter((item) => vinculos.some((vinculo) => vinculo.empresaId === item.id))
    : base.empresas
  const ids = new Set(empresas.map((item) => item.id))
  const proyectos = empresas.length === base.empresas.length
    ? base.proyectos
    : base.proyectos.filter((item) => ids.has(item.empresaId))
  const personas = esAdmin(actor)
    ? await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 })
    : equipos.length === 0
      ? [{ id: actor.id, name: actor.name }]
      : await prisma.user.findMany({
          where: { active: true, OR: [{ id: actor.id }, { areaRoles: { some: { team: { in: equipos } } } }] },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: 200,
        })
  return { empresas, areas: base.areas, proyectos, tipos: base.tipos, personas }
})
