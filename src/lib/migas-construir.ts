import { etiquetaMiga } from "@/lib/migas-etiqueta"

export const NOMBRES_MIGA: Record<string, string> = {
  panel: "Inicio",
  requerimientos: "Requerimientos",
  nuevo: "Radicar",
  tablero: "Tablero",
  proyectos: "Proyectos",
  planner: "Planner",
  plan: "Plan de trabajo",
  objetivos: "Objetivos",
  informes: "Informe semanal",
  kpis: "KPIs",
  areas: "Por área",
  mios: "Mis KPIs",
  growth: "Growth",
  gerencia: "Panel de gestión",
  rendimiento: "Rendimiento",
  personas: "Personas",
  paneles: "Panel de gestión",
  ayuda: "Ayuda",
  "mis-solicitudes": "Mis solicitudes",
  radicar: "Radicar solicitud",
  notificaciones: "Avisos",
  cola: "Cola de entrada",
  bandeja: "Bandeja de respuesta",
  admin: "Administración",
  usuarios: "Usuarios",
  catalogos: "Catálogos",
  flujos: "Flujos y SLA",
  espacios: "Espacios",
  paginas: "Páginas",
  formularios: "Formularios",
  adjuntos: "Adjuntos",
  calendario: "Calendario",
  lista: "Lista",
  perfil: "Mi perfil",
}

export function construirMigas(path: string, nombre = "", conocidas: Record<string, string> = NOMBRES_MIGA) {
  const partes = path.split("/").filter(Boolean)
  const migas = [{ href: "/panel", label: "Inicio" }]
  let acumulado = ""
  partes.forEach((parte, index) => {
    if (parte === "panel") return
    acumulado += `/${parte}`
    const label = etiquetaMiga(parte, index, partes, nombre, conocidas)
    if (!label) return
    migas.push({ href: acumulado, label })
  })
  return migas
}

export function padreDeMigas(migas: { href: string }[], inicio = "/panel") {
  if (migas.length < 2) return inicio
  return migas[migas.length - 2]?.href || inicio
}
