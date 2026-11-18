import { slaSnapshot, windowsFromEnv, type PauseInterval, type SlaSnapshot } from "@/lib/sla"

export type SolicitudSla = {
  slaStartedAt: Date
  resolutionMinutes?: number
  slaTargetMinutes: number
  pauses: { startedAt: Date; endedAt: Date | null }[]
  resolvedAt: Date | null
  status: string
}

export function snapshotSolucion(request: SolicitudSla, now = new Date(), windows = windowsFromEnv()) {
  const target = request.resolutionMinutes || request.slaTargetMinutes
  const pauses: PauseInterval[] = request.pauses.map((pause) => ({
    startedAt: pause.startedAt,
    endedAt: pause.endedAt,
  }))
  const snap: SlaSnapshot = slaSnapshot(
    {
      startedAt: request.slaStartedAt,
      targetMinutes: target,
      pauses,
      now,
      resolvedAt: request.resolvedAt,
      cancelled: request.status === "CANCELADO" || request.status === "RECHAZADO",
      riskRatio: Number(process.env.SLA_RISK_RATIO || 0.75),
    },
    windows,
  )
  return { target, snap }
}
