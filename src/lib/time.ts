export const ZONE = "America/Bogota"

export function allowedDomain() {
  return (process.env.AUTH_ALLOWED_EMAIL_DOMAIN || "cifes.edu.co").trim().toLowerCase()
}

export function isInternalEmail(email: string, domain = allowedDomain()) {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf("@")
  if (at <= 0) return false
  return normalized.slice(at + 1) === domain
}
