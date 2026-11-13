import type { PrismaClient } from "@prisma/client"
import { ESTADOS_OFICIALES, SLA_POR_DEFECTO, TIPOS_OFICIALES, TRANSICIONES_OFICIALES } from "@/lib/flujo-oficial"
import { prisma } from "@/lib/prisma"

export async function asegurarCatalogo(client: PrismaClient = prisma) {
  for (const estado of ESTADOS_OFICIALES) {
    await client.workflowState.upsert({
      where: { team_key: { team: estado.team, key: estado.key } },
      update: {},
      create: {
        team: estado.team,
        key: estado.key,
        name: estado.name,
        category: estado.category,
        sortOrder: estado.sortOrder,
        boardColumn: estado.boardColumn,
        hiddenOnBoard: estado.hiddenOnBoard ?? false,
      },
    })
  }
  for (const transition of TRANSICIONES_OFICIALES) {
    const fromKeys = transition.from.join(",")
    await client.workflowTransition.upsert({
      where: { team_name_fromKeys_toKey: { team: transition.team, name: transition.name, fromKeys, toKey: transition.to } },
      update: {},
      create: {
        team: transition.team,
        name: transition.name,
        fromKeys,
        toKey: transition.to,
        allowedRoles: transition.roles.join(","),
        requiresComment: transition.requiresComment ?? false,
        requiresAssignee: transition.requiresAssignee ?? false,
        requiresCommittedDate: transition.requiresCommittedDate ?? false,
        requiresDelivery: transition.requiresDelivery ?? false,
        slaEffect: transition.slaEffect,
        resolution: transition.resolution ?? "",
        clearResolution: transition.clearResolution ?? false,
        incrementRounds: transition.incrementRounds ?? false,
        toPrevious: transition.toPrevious ?? false,
        reopenWithinDays: transition.reopenWithinDays ?? 0,
      },
    })
  }
  for (const tipo of TIPOS_OFICIALES) {
    await client.requestType.upsert({
      where: { team_name: { team: tipo.team, name: tipo.name } },
      update: { extra: tipo.extra, active: true },
      create: tipo,
    })
  }
  const marcas = [
    { key: "CIFES", name: "CIFES", sortOrder: 1 },
    { key: "LUVANIA", name: "Luvania", sortOrder: 2 },
    { key: "AMBAS", name: "Ambas/Transversal", sortOrder: 3 },
  ]
  const prioridades = [
    { key: "CRITICA", name: "Crítica", sortOrder: 1 },
    { key: "ALTA", name: "Alta", sortOrder: 2 },
    { key: "MEDIA", name: "Media", sortOrder: 3 },
    { key: "BAJA", name: "Baja", sortOrder: 4 },
  ]
  for (const item of marcas) {
    await client.catalogItem.upsert({
      where: { kind_key: { kind: "MARCA", key: item.key } },
      update: { name: item.name },
      create: { kind: "MARCA", ...item },
    })
  }
  for (const item of prioridades) {
    await client.catalogItem.upsert({
      where: { kind_key: { kind: "PRIORIDAD", key: item.key } },
      update: { name: item.name },
      create: { kind: "PRIORIDAD", ...item },
    })
  }
  for (const policy of SLA_POR_DEFECTO) {
    const existing = await client.slaPolicy.findFirst({
      where: { team: policy.team, typeId: null, priority: policy.priority },
    })
    if (!existing) {
      await client.slaPolicy.create({
        data: {
          team: policy.team,
          priority: policy.priority,
          firstResponseMinutes: policy.first,
          resolutionMinutes: policy.resolution,
        },
      })
    }
  }
}
