import { redirect } from "next/navigation"

export default async function GerenciaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const item = Array.isArray(value) ? value[0] : value
    if (item) query.set(key, item)
  }
  const texto = query.toString()
  redirect(texto ? `/paneles?${texto}` : "/paneles")
}
