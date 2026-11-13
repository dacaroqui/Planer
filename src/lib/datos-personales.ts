const AVISO =
  "No incluya datos personales de estudiantes, deudores, pacientes ni socios (nombres, documentos, teléfonos, historias). Use datos anonimizados o de prueba."

export function avisoDatosPersonales() {
  return AVISO
}

export function pareceDatoPersonal(texto: string) {
  const sinCodigos = texto.replace(/\b(?:DES|MKT|REQ)-\d+\b/gi, " ")
  const celular = /\b(?:\+?57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/.test(sinCodigos)
  const cedula = sinCodigos.split(/\s+/).some((token) => {
    const digits = token.replace(/[.\-]/g, "")
    if (!/^\d{6,10}$/.test(digits)) return false
    if (/^(19|20)\d{2}$/.test(digits)) return false
    return true
  })
  return celular || cedula
}
