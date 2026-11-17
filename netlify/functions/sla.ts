const base = () => (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "")

export default async function sla() {
  const secret = process.env.CRON_SECRET
  const url = base()
  if (!secret || !url) {
    return new Response("Faltan URL y CRON_SECRET.", { status: 500 })
  }
  const response = await fetch(`${url}/api/cron/sla`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  })
  return new Response(await response.text(), { status: response.status })
}
