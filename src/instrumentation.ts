export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (process.env.NEXT_PHASE === "phase-production-build") return
  const { asegurarCatalogo } = await import("@/server/semilla")
  const { asegurarAdminInicial } = await import("@/server/admin-inicial")
  try {
    await asegurarCatalogo()
    await asegurarAdminInicial()
    const enPlataforma = process.env.VERCEL === "1" || process.env.NETLIFY === "true"
    if (process.env.SLA_SCHEDULER === "true" && process.env.CRON_SECRET && !enPlataforma) {
      const port = process.env.PORT || "3000"
      const secreto = process.env.CRON_SECRET
      setInterval(() => {
        fetch(`http://127.0.0.1:${port}/api/cron/sla`, {
          method: "POST",
          headers: { authorization: `Bearer ${secreto}` },
        }).catch((error) => console.error("No se pudo revisar el SLA", error))
      }, 60 * 60 * 1000)
    }
  } catch (error) {
    console.error("No se pudo preparar el catálogo o el administrador inicial.", error)
  }
}
