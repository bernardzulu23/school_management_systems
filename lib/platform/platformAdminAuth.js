import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { JWT_AUDIENCE } from '@/lib/middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'

/** Default developer console account (override via PLATFORM_ADMIN_EMAIL). */
export const DEFAULT_PLATFORM_ADMIN_EMAIL = 'super-admin@bluepeacktechnologies.com'

function envPlatformEmails() {
  const raw =
    process.env.PLATFORM_ADMIN_EMAILS ||
    process.env.PLATFORM_ADMIN_EMAIL ||
    DEFAULT_PLATFORM_ADMIN_EMAIL
  return new Set(
    raw
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
  } catch (err) {
    console.error('[platformAdmin] find failed:', err?.message || err)
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
    { algorithm: 'HS256', expiresIn: '8h', audience: JWT_AUDIENCE }
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
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || DEFAULT_PLATFORM_ADMIN_EMAIL)
    .trim()
    .toLowerCase()
  const password = process.env.PLATFORM_ADMIN_PASSWORD
  if (!email || !password || password.length < 8) return null

  const syncPassword = process.env.PLATFORM_ADMIN_SYNC_PASSWORD === 'true'

  try {
    const existing = await prisma.platformAdmin.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (existing && !syncPassword) {
      return existing
    }

    const hashed = await bcrypt.hash(password, 12)
    return prisma.platformAdmin.upsert({
      where: { email: existing?.email || email },
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
  } catch (err) {
    console.error('[ensurePlatformAdminFromEnv]', err?.message || err)
    return null
  }
}

/** Hint for login failures (missing table vs wrong password). */
export async function getPlatformLoginHint(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  try {
    const count = await prisma.platformAdmin.count()
    if (count === 0) {
      return 'No platform admin in database. On the server run: npx prisma db push && npm run seed:platform-admin'
    }
    const row = await prisma.platformAdmin.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    })
    if (!row) {
      return 'This email is not registered as a platform admin. Use the seeded email or set PLATFORM_ADMIN_EMAIL.'
    }
    if (!row.active) {
      return 'This platform admin account is disabled.'
    }
  } catch {
    return 'PlatformAdmin table may be missing. Run: npx prisma db push && npm run seed:platform-admin'
  }
  if (process.env.PLATFORM_ADMIN_PASSWORD) {
    return 'If login still fails, set PLATFORM_ADMIN_SYNC_PASSWORD=true once, redeploy, sign in with PLATFORM_ADMIN_PASSWORD, then remove the flag.'
  }
  return 'Wrong password. Re-run: npm run seed:platform-admin (uses seed password unless PLATFORM_ADMIN_PASSWORD is set).'
}
