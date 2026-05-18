import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'

function envPlatformEmails() {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS || process.env.PLATFORM_ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

async function findPlatformAdminByEmail(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  if (!normalized) return null

  try {
    const row = await prisma.platformAdmin.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' }, active: true },
    })
    if (row) return row
  } catch {
    // table may not exist until migration
  }

  const allowed = envPlatformEmails()
  if (!allowed.has(normalized)) return null

  const envPassword = process.env.PLATFORM_ADMIN_PASSWORD
  if (!envPassword) return null

  return {
    id: 'env-platform-admin',
    email: normalized,
    name: process.env.PLATFORM_ADMIN_NAME || 'Platform Developer',
    password: envPassword,
    _envPasswordPlain: true,
  }
}

export async function verifyPlatformAdminCredentials(email, password) {
  const admin = await findPlatformAdminByEmail(email)
  if (!admin) return null

  if (admin._envPasswordPlain) {
    if (String(password) !== String(admin.password)) return null
    return { id: admin.id, email: admin.email, name: admin.name }
  }

  const hash = String(admin.password || '')
  if (!hash.startsWith('$2')) return null
  const valid = await bcrypt.compare(String(password), hash)
  if (!valid) return null

  return { id: admin.id, email: admin.email, name: admin.name }
}

export function signPlatformToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'superadmin',
      schoolId: null,
      isPlatform: true,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  )
}

/** Resolve DB row for the current platform JWT (by id, then email). */
export async function resolvePlatformAdminRecord(tokenUser) {
  if (!tokenUser?.email && !tokenUser?.id) return null

  const email = String(tokenUser.email || '')
    .trim()
    .toLowerCase()

  try {
    if (tokenUser.id && tokenUser.id !== 'env-platform-admin') {
      const byId = await prisma.platformAdmin.findFirst({
        where: { id: String(tokenUser.id), active: true },
      })
      if (byId) return byId
    }
    if (email) {
      return prisma.platformAdmin.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, active: true },
      })
    }
  } catch {
    return null
  }
  return null
}

export async function verifyPlatformAdminPassword(record, password) {
  if (!record?.password) return false
  const hash = String(record.password)
  if (!hash.startsWith('$2')) return false
  return bcrypt.compare(String(password), hash)
}

export async function ensurePlatformAdminFromEnv() {
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || 'super-admin@bluepeacktechnologies.com')
    .trim()
    .toLowerCase()
  const password = process.env.PLATFORM_ADMIN_PASSWORD
  if (!email || !password || password.length < 8) return null

  try {
    const hashed = await bcrypt.hash(password, 12)
    return prisma.platformAdmin.upsert({
      where: { email },
      update: {
        password: hashed,
        name: process.env.PLATFORM_ADMIN_NAME || 'Platform Super Admin',
        active: true,
      },
      create: {
        email,
        password: hashed,
        name: process.env.PLATFORM_ADMIN_NAME || 'Platform Super Admin',
        active: true,
      },
    })
  } catch {
    return null
  }
}
