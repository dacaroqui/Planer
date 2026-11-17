export const CORREOS_CONSERVADOS = ["producto@cifes.edu.co", "admin@cifes.edu.co"] as const

export function conservarUsuario(email: string) {
  return CORREOS_CONSERVADOS.includes(email.trim().toLowerCase() as (typeof CORREOS_CONSERVADOS)[number])
}

export type ConteosLimpieza = {
  solicitudes: number
  tareas: number
  pausas: number
  comentarios: number
  historial: number
  adjuntos: number
  proyectos: number
  invitaciones: number
  usuarios: number
  secuencias: string[]
}

export function codigoTrasReinicio() {
  return "0001"
}

export function resumenLimpieza(conteo: ConteosLimpieza, seco: boolean) {
  const modo = seco ? "Simulación. No se borró nada." : "Limpieza aplicada."
  return [
    modo,
    `Solicitudes: ${conteo.solicitudes}`,
    `Tareas: ${conteo.tareas}`,
    `Pausas de SLA: ${conteo.pausas}`,
    `Comentarios: ${conteo.comentarios}`,
    `Historial: ${conteo.historial}`,
    `Adjuntos: ${conteo.adjuntos}`,
    `Proyectos: ${conteo.proyectos}`,
    `Invitaciones: ${conteo.invitaciones}`,
    `Usuarios de demostración: ${conteo.usuarios}`,
    `Secuencias ${conteo.secuencias.join(", ") || "ninguna"}: el siguiente código empieza en ${codigoTrasReinicio()}.`,
    `Se conservan ${CORREOS_CONSERVADOS.join(" y ")}, y los catálogos (áreas, empresas, tipos, flujos, SLA y equipos).`,
  ].join("\n")
}
