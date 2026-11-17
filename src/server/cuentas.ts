import type { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { DomainError, type Actor, type Membership, type TeamName } from "@/lib/domain"
import { puedeAdministrar } from "@/lib/permissions"
import { isInternalEmail } from "@/lib/time"
import { hashClave, validarClave, verificarClave } from "@/lib/clave"
import {
  INVITACION_DIAS,
  RESTABLECIMIENTO_HORAS,
  cuentaBloqueada,
  crearToken,
  hashToken,
  registrarFallo,
  registroPublicoHabilitado,
  venceEnDias,
  venceEnHoras,
  type CodigoIngreso,
} from "@/lib/cuentas"
import { appBaseUrl, correoSmtpActivo, createEmailProvider } from "@/lib/email"

const ROLES_EQUIPO = new Set(["AGENTE", "LIDER", "OBSERVADOR"])

export type RolAsignable = "SOLICITANTE" | "AGENTE" | "LIDER" | "OBSERVADOR" | "ADMINISTRADOR"

function correoDe(email: string) {
  return email.trim().toLowerCase()
}

function exigirDominio(email: string) {
  if (!isInternalEmail(email)) throw new DomainError("El correo no pertenece a un dominio permitido.")
}

function exigirAdmin(actor: Actor) {
  if (!puedeAdministrar(actor)) throw new DomainError("Solo el administrador gestiona las cuentas.")
}

async function auditar(actorId: string | null, action: string, entityId: string, toValue: string) {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "User", entityId, toValue },
  })
}

async function areasValidas(areaId: string, areaIds: string[]) {
  const ids = [...new Set([areaId, ...areaIds].filter(Boolean))]
  const areas = await prisma.area.findMany({ where: { id: { in: ids }, active: true } })
  if (!areaId || areas.length !== ids.length) throw new DomainError("Elija un área activa.")
  return ids
}

async function empresasValidas(empresaIds: string[]) {
  const ids = [...new Set(empresaIds.filter(Boolean))]
  if (ids.length === 0) return []
  const empresas = await prisma.empresa.findMany({ where: { id: { in: ids }, active: true } })
  if (empresas.length !== ids.length) throw new DomainError("Elija empresas activas.")
  return ids
}

export function membresiasDe(rol: RolAsignable, teams: TeamName[]): Membership[] {
  if (!ROLES_EQUIPO.has(rol)) return []
  if (teams.length === 0) throw new DomainError("Elija el equipo del rol.")
  return teams.map((team) => ({ team, role: rol as Membership["role"] }))
}

function leerMembresias(raw: string): Membership[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Membership[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => (
      (item.team === "DESARROLLO" || item.team === "MARKETING")
      && ROLES_EQUIPO.has(item.role)
    ))
  } catch {
    return []
  }
}

export async function intentarIngreso(email: string, password: string): Promise<
  { ok: true; id: string; email: string; name: string } | { ok: false; code: Exclude<CodigoIngreso, "ok"> }
> {
  const correo = correoDe(email)
  if (!isInternalEmail(correo) || !password) return { ok: false, code: "credenciales" }
  const user = await prisma.user.findUnique({ where: { email: correo } })
  if (!user?.passwordHash) return { ok: false, code: "credenciales" }
  const ahora = new Date()
  if (cuentaBloqueada(user.lockedUntil, ahora)) return { ok: false, code: "bloqueado" }
  const intentos = user.lockedUntil && user.lockedUntil <= ahora ? 0 : user.failedAttempts
  const coincide = await verificarClave(password, user.passwordHash)
  if (!coincide) {
    const next = registrarFallo(intentos, ahora)
    await prisma.user.update({ where: { id: user.id }, data: next })
    return { ok: false, code: next.lockedUntil ? "bloqueado" : "credenciales" }
  }
  if (!user.active) return { ok: false, code: "inactivo" }
  if (user.pendiente) return { ok: false, code: "pendiente" }
  if (user.failedAttempts || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } })
  }
  return { ok: true, id: user.id, email: user.email, name: user.name }
}

async function enviar(to: string, subject: string, text: string) {
  if (!correoSmtpActivo()) return false
  await createEmailProvider().send({ to, subject, text })
  return true
}

export async function crearInvitacion(
  actor: Actor,
  input: {
    email: string
    rol: RolAsignable
    areaId: string
    areaIds: string[]
    empresaIds: string[]
    teams: TeamName[]
  },
) {
  exigirAdmin(actor)
  const email = correoDe(input.email)
  exigirDominio(email)
  const memberships = membresiasDe(input.rol, input.teams)
  const areaIds = await areasValidas(input.areaId, input.areaIds)
  const empresaIds = await empresasValidas(input.empresaIds)
  const { token, tokenHash } = crearToken()
  await prisma.invitacion.create({
    data: {
      tokenHash,
      email,
      role: input.rol,
      areaId: input.areaId,
      areaIds: areaIds.join(","),
      empresaIds: empresaIds.join(","),
      memberships: JSON.stringify(memberships),
      expiresAt: venceEnDias(INVITACION_DIAS),
      createdById: actor.id,
    },
  })
  const enlace = `${appBaseUrl()}/invitar/${token}`
  const equipos = input.teams.length ? input.teams.map((team) => team === "DESARROLLO" ? "Desarrollo" : "Marketing").join(" y ") : "sin equipo"
  const resumen = `${email} · ${input.rol} · ${equipos}`
  let enviado = false
  try {
    enviado = await enviar(
      email,
      "Invitación a la mesa de requerimientos",
      `Le invitaron a Mesa con el rol ${input.rol}. Abra el enlace, escriba su nombre y cree una contraseña. Vence en ${INVITACION_DIAS} días y solo puede usarse una vez.\n\n${enlace}\n`,
    )
  } catch (error) {
    console.error("No se pudo enviar la invitación", error)
  }
  await auditar(actor.id, "INVITACION", email, input.rol)
  return { enlace, enviado, resumen }
}

export async function leerInvitacion(token: string) {
  const row = await prisma.invitacion.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null
  return { email: row.email, role: row.role }
}

export async function aceptarInvitacion(token: string, name: string, password: string) {
  const row = await prisma.invitacion.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!row || row.usedAt) throw new DomainError("El enlace no es válido o ya se usó.")
  if (row.expiresAt.getTime() < Date.now()) throw new DomainError("El enlace venció. Pida una invitación nueva.")
  const limpio = name.trim()
  if (limpio.length < 3) throw new DomainError("Escriba su nombre.")
  const clave = validarClave(password, row.email)
  if (clave) throw new DomainError(clave)
  const areaId = row.areaId || ""
  const areaIds = row.areaIds.split(",").filter(Boolean)
  const empresaIds = row.empresaIds.split(",").filter(Boolean)
  const memberships = leerMembresias(row.memberships)
  const passwordHash = await hashClave(password)
  const existente = await prisma.user.findUnique({ where: { email: row.email } })
  if (existente?.passwordHash && existente.active && !existente.pendiente) {
    await prisma.invitacion.update({ where: { id: row.id }, data: { usedAt: new Date() } })
    throw new DomainError("Esa cuenta ya está activa. Ingrese o pida un enlace de restablecimiento.")
  }
  const isAdmin = row.role === "ADMINISTRADOR"
  const data = {
    name: limpio,
    passwordHash,
    role: (isAdmin ? "ADMINISTRADOR" : "SOLICITANTE") as Role,
    areaId,
    active: true,
    pendiente: false,
    failedAttempts: 0,
    lockedUntil: null,
    team: null,
  }
  const user = existente
    ? await prisma.user.update({ where: { id: existente.id }, data })
    : await prisma.user.create({ data: { ...data, email: row.email } })
  await prisma.$transaction([
    prisma.areaRole.deleteMany({ where: { userId: user.id } }),
    prisma.usuarioArea.deleteMany({ where: { userId: user.id } }),
    prisma.usuarioEmpresa.deleteMany({ where: { userId: user.id } }),
    ...(memberships.length
      ? [prisma.areaRole.createMany({ data: memberships.map((item) => ({ userId: user.id, team: item.team, role: item.role })) })]
      : []),
    prisma.usuarioArea.createMany({ data: (areaIds.length ? areaIds : [areaId]).filter(Boolean).map((id) => ({ userId: user.id, areaId: id })) }),
    ...(empresaIds.length
      ? [prisma.usuarioEmpresa.createMany({ data: empresaIds.map((empresaId) => ({ userId: user.id, empresaId })) })]
      : []),
    prisma.invitacion.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.auditLog.create({
      data: { action: "INVITACION_ACEPTADA", entity: "User", entityId: user.id, toValue: row.role },
    }),
  ])
  return user
}

export async function crearUsuarioManual(
  actor: Actor,
  input: {
    name: string
    email: string
    password: string
    rol: RolAsignable
    areaId: string
    areaIds: string[]
    empresaIds: string[]
    teams: TeamName[]
    active: boolean
  },
) {
  exigirAdmin(actor)
  const email = correoDe(input.email)
  exigirDominio(email)
  const name = input.name.trim()
  if (name.length < 3) throw new DomainError("Escriba el nombre.")
  const clave = validarClave(input.password, email)
  if (clave) throw new DomainError(clave)
  if (await prisma.user.findUnique({ where: { email } })) throw new DomainError("Ya existe una cuenta con ese correo.")
  const memberships = membresiasDe(input.rol, input.teams)
  const areaIds = await areasValidas(input.areaId, input.areaIds)
  const empresaIds = await empresasValidas(input.empresaIds)
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashClave(input.password),
      role: input.rol === "ADMINISTRADOR" ? "ADMINISTRADOR" : "SOLICITANTE",
      areaId: input.areaId,
      active: input.active,
      pendiente: false,
      areaRoles: { create: memberships },
      areasExtra: { create: areaIds.map((areaId) => ({ areaId })) },
      empresas: { create: empresaIds.map((empresaId) => ({ empresaId })) },
    },
  })
  await auditar(actor.id, "USUARIO_CREADO", user.id, `${email} ${input.rol}`)
  return user
}

async function emitirRestablecimiento(userId: string, actorId: string | null) {
  const { token, tokenHash } = crearToken()
  await prisma.restablecimiento.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } })
  await prisma.restablecimiento.create({
    data: {
      tokenHash,
      userId,
      expiresAt: venceEnHoras(RESTABLECIMIENTO_HORAS),
      createdById: actorId,
    },
  })
  return `${appBaseUrl()}/restablecer/${token}`
}

export async function generarRestablecimiento(actor: Actor, userId: string) {
  exigirAdmin(actor)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new DomainError("El usuario no existe.")
  const enlace = await emitirRestablecimiento(user.id, actor.id)
  let enviado = false
  try {
    enviado = await enviar(
      user.email,
      "Restablecer la contraseña de la mesa",
      `Use este enlace para crear una contraseña nueva. Vence en ${RESTABLECIMIENTO_HORAS} horas y solo puede usarse una vez.\n\n${enlace}\n`,
    )
  } catch (error) {
    console.error("No se pudo enviar el restablecimiento", error)
  }
  await auditar(actor.id, "RESTABLECIMIENTO", user.id, user.email)
  return { enlace, enviado }
}

export async function solicitarRestablecimiento(email: string) {
  if (!correoSmtpActivo()) {
    throw new DomainError("El correo no está configurado. Pida el enlace al administrador.")
  }
  const correo = correoDe(email)
  const user = isInternalEmail(correo) ? await prisma.user.findUnique({ where: { email: correo } }) : null
  if (user) {
    const enlace = await emitirRestablecimiento(user.id, null)
    await enviar(
      user.email,
      "Restablecer la contraseña de la mesa",
      `Use este enlace para crear una contraseña nueva. Vence en ${RESTABLECIMIENTO_HORAS} horas y solo puede usarse una vez.\n\n${enlace}\n`,
    )
  }
}

export async function leerRestablecimiento(token: string) {
  const row = await prisma.restablecimiento.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null
  return { email: row.user.email }
}

export async function aplicarRestablecimiento(token: string, password: string) {
  const row = await prisma.restablecimiento.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
  if (!row || row.usedAt) throw new DomainError("El enlace no es válido o ya se usó.")
  if (row.expiresAt.getTime() < Date.now()) throw new DomainError("El enlace venció. Pida uno nuevo.")
  const clave = validarClave(password, row.user.email)
  if (clave) throw new DomainError(clave)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashClave(password), failedAttempts: 0, lockedUntil: null },
    }),
    prisma.restablecimiento.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.auditLog.create({
      data: { action: "CLAVE_RESTABLECIDA", entity: "User", entityId: row.userId, toValue: row.user.email },
    }),
  ])
}

export async function registrarCuenta(input: { name: string; email: string; password: string }) {
  if (!registroPublicoHabilitado()) throw new DomainError("El registro propio está desactivado. Pida una invitación.")
  const email = correoDe(input.email)
  exigirDominio(email)
  const name = input.name.trim()
  if (name.length < 3) throw new DomainError("Escriba su nombre.")
  const clave = validarClave(input.password, email)
  if (clave) throw new DomainError(clave)
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new DomainError("Si el correo es válido, espere la aprobación o pida una invitación.")
  }
  let area = await prisma.area.findFirst({ where: { active: true }, orderBy: { name: "asc" } })
  if (!area) area = await prisma.area.create({ data: { name: "Dirección" } })
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashClave(input.password),
      role: "SOLICITANTE",
      areaId: area.id,
      active: true,
      pendiente: true,
    },
  })
  await auditar(null, "REGISTRO_PENDIENTE", user.id, email)
  return user
}

export async function sincronizarPerfil(
  actor: Actor,
  userId: string,
  input: { empresaIds: string[]; areaIds: string[]; pendiente: boolean },
) {
  exigirAdmin(actor)
  const areaIds = [...new Set(input.areaIds.filter(Boolean))]
  const empresaIds = await empresasValidas(input.empresaIds)
  if (areaIds.length) {
    const areas = await prisma.area.findMany({ where: { id: { in: areaIds }, active: true } })
    if (areas.length !== areaIds.length) throw new DomainError("Elija áreas activas.")
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { pendiente: input.pendiente } }),
    prisma.usuarioArea.deleteMany({ where: { userId } }),
    ...(areaIds.length ? [prisma.usuarioArea.createMany({ data: areaIds.map((areaId) => ({ userId, areaId })) })] : []),
    prisma.usuarioEmpresa.deleteMany({ where: { userId } }),
    ...(empresaIds.length ? [prisma.usuarioEmpresa.createMany({ data: empresaIds.map((empresaId) => ({ userId, empresaId })) })] : []),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.pendiente ? "CUENTA_PENDIENTE" : "CUENTA_APROBADA",
        entity: "User",
        entityId: userId,
        toValue: empresaIds.join(","),
      },
    }),
  ])
}
