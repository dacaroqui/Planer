export function middlewarePermite(path: string, autenticado: boolean) {
  if (path.startsWith("/api/")) return true
  if (
    path === "/login" ||
    path === "/registro" ||
    path.startsWith("/invitar/") ||
    path.startsWith("/restablecer/")
  ) return true
  return autenticado
}

export function cuerpoSinSesion() {
  return { error: "Debe iniciar sesión." }
}
