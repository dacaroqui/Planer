export function etiquetaMiga(
  parte: string,
  index: number,
  partes: string[],
  nombre: string,
  conocidas: Record<string, string>,
) {
  if (partes[index - 1] === "growth" && parte === "nuevo") return "Proponer"
  if (partes[index - 1] === "growth" && parte === "ciclos") return "Ciclos"
  if (partes[index - 1] === "objetivos" && parte === "nuevo") return "Nuevo objetivo"
  if (partes[index - 1] === "kpis" && parte === "nuevo") return "Nuevo KPI"
  if (partes[index - 1] === "kpis" && parte === "personas") return "Por persona"
  if (parte === "editar" && (partes.includes("objetivos") || partes.includes("kpis"))) return "Editar"
  if ((partes[index - 1] === "objetivos" || partes[index - 1] === "kpis") && !conocidas[parte]) return ""
  if (conocidas[parte]) return conocidas[parte]
  if (partes[index - 1] === "espacios" && nombre) return nombre
  if (index === partes.length - 1 && nombre) return nombre
  return decodeURIComponent(parte)
}
