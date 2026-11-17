import bcrypt from "bcryptjs"

export function rondasClave() {
  const value = Number(process.env.BCRYPT_ROUNDS || 12)
  return Number.isFinite(value) && value >= 4 ? value : 12
}

export function hashClave(password: string) {
  return bcrypt.hash(password, rondasClave())
}

export function verificarClave(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function validarClave(password: string, email = "") {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres."
  if (password.length > 200) return "La contraseña es demasiado larga."
  if (email && password.toLowerCase() === email.trim().toLowerCase()) {
    return "La contraseña no puede ser igual al correo."
  }
  return null
}
