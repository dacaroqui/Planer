export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (process.env.NEXT_PHASE === "phase-production-build") return
  const { asegurarCatalogo } = await import("@/server/semilla")
  const { asegurarAdminInicial } = await import("@/server/admin-inicial")
  try {
    await asegurarCatalogo()
    await asegurarAdminInicial()
    if (process.env.SLA_SCHEDULER === "true" && process.env.CRON_SECRET) {
      const { vigilarSlas } = await import("@/server/requests")
      setInterval(() => {
        vigilarSlas().catch((error) => console.error("No se pudo revisar el SLA", error))
      }, 60 * 60 * 1000)
    }
  } catch (error) {
    console.error("No se pudo preparar el catálogo o el administrador inicial.", error)
  }
}
