import * as jose from 'jose'
import type { JWTPayload } from 'jose'
import { secureJson } from '@/lib/security/api'

export interface AppUser extends JWTPayload {
  id: string
  userId?: string
  schoolId: string
  role: string
  email: string
  name?: string
  subdomain?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set in production environment.')
}

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET)
}

export async function authMiddleware(request: Request) {
  const req = request as any
  const token =
    req.cookies?.get?.('access_token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return {
      isAuthenticated: false as const,
      user: undefined,
      response: secureJson({ error: 'Unauthorized: No token provided' }, { status: 401 }, request),
    }
  }

  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey())
    const user = payload as AppUser
    return { isAuthenticated: true as const, user }
  } catch {
    return {
      isAuthenticated: false as const,
      user: undefined,
      response: secureJson({ error: 'Unauthorized: Invalid token' }, { status: 401 }, request),
    }
  }
}

export async function getAuthUser(request: Request): Promise<AppUser | null> {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return null
  return auth.user ?? null
}

export const ROLE_ALIASES: Record<string, string[]> = {
  ADMIN: [
    'headteacher',
    'admin',
    'administrator',
    'school administrator',
    'school admin',
    'schooladministrator',
    'school_admin',
    'school-admin',
    'principal',
    'head teacher',
    'head-teacher',
    'headmaster',
    'school principal',
  ],
  HOD: ['hod', 'head of department', 'head-of-department', 'department head', 'dept head'],
  TEACHER: ['teacher', 'class teacher', 'class-teacher', 'classteacher'],
  STUDENT: ['student'],
}

export const ROLE_GROUPS = {
  ADMIN_ONLY: ['ADMIN'],
  SCHOOL_STAFF: ['ADMIN', 'HOD', 'TEACHER'],
  ALL_AUTHENTICATED: ['ADMIN', 'HOD', 'TEACHER', 'STUDENT'],
}

export function normalizeRole(role: string): string {
  return String(role || '')
    .trim()
    .toLowerCase()
}

function normalizeRoleKey(role: string): string {
  return normalizeRole(role).replace(/[^a-z0-9]+/g, '')
}

export function roleCheck(user: AppUser | undefined, allowedRoles: string[]): boolean {
  if (!user || !user.role) return false
  const role = normalizeRole(user.role)
  const roleKey = normalizeRoleKey(user.role)
  return allowedRoles.some((allowed) => {
    const aliases = ROLE_ALIASES[allowed] || [normalizeRole(allowed)]
    const lowerAliases = aliases.map((a) => normalizeRole(a))
    if (lowerAliases.includes(role)) return true
    const aliasKeys = aliases.map((a) => normalizeRoleKey(a))
    return aliasKeys.includes(roleKey)
  })
}
