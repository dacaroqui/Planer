export const ZONE = "America/Bogota"

export function allowedDomains() {
  return (process.env.AUTH_ALLOWED_EMAIL_DOMAIN || "cifes.edu.co")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function allowedDomain() {
  return allowedDomains()[0] || "cifes.edu.co"
}

export function isInternalEmail(email: string, domain = allowedDomains().join(",")) {
  const domains = domain.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf("@")
  if (at <= 0) return false
  return domains.includes(normalized.slice(at + 1))
}
