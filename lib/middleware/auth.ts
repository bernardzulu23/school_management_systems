import * as jose from 'jose'
import type { JWTPayload } from 'jose'
import { secureJson } from '@/lib/security/api'

export interface AppUser extends JWTPayload {
  id: string
  userId?: string
  schoolId?: string | null
  role: string
  email: string
  name?: string
  subdomain?: string
  isPlatform?: boolean
}

export function isPlatformSession(user: AppUser | undefined): boolean {
  return Boolean(user?.isPlatform) && normalizeRole(user?.role || '') === 'superadmin'
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'

/** Audience claim — pins tokens to this API, preventing reuse in other contexts. */
export const JWT_AUDIENCE = 'zsms-api'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set in production environment.')
}

/**
 * Candidate signing keys, newest first. Includes JWT_SECRET_PREVIOUS (when set)
 * so a secret can be rotated with zero downtime — tokens signed with the old
 * secret keep verifying until they expire. See docs/SECRET_ROTATION.md.
 */
function secretKeys(): Uint8Array[] {
  const enc = new TextEncoder()
  const keys = [enc.encode(process.env.JWT_SECRET || JWT_SECRET)]
  const previous = String(process.env.JWT_SECRET_PREVIOUS || '').trim()
  if (previous) keys.push(enc.encode(previous))
  return keys
}

/**
 * Verify an access token with HS256 pinned (blocks the algorithm-confusion /
 * 'none' attack) and a transition-safe audience check: a wrong `aud` is
 * rejected, but legacy tokens issued before the claim existed still verify.
 */
async function verifyAccessToken(token: string): Promise<AppUser> {
  let lastError: unknown
  for (const key of secretKeys()) {
    try {
      const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] })
      if (payload.aud && payload.aud !== JWT_AUDIENCE) {
        throw new Error('Invalid token audience')
      }
      return payload as AppUser
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Token verification failed')
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
    const user = await verifyAccessToken(token)

    if (!user?.id) {
      return {
        isAuthenticated: false as const,
        user: undefined,
        response: secureJson(
          { error: 'Unauthorized: invalid session', code: 'INVALID_SESSION' },
          { status: 401 },
          request
        ),
      }
    }

    if (isPlatformSession(user)) {
      return { isAuthenticated: true as const, user }
    }

    if (!user?.schoolId) {
      return {
        isAuthenticated: false as const,
        user: undefined,
        response: secureJson(
          { error: 'Unauthorized: invalid session', code: 'INVALID_SESSION' },
          { status: 401 },
          request
        ),
      }
    }

    const headerSchoolId = request.headers.get('x-school-id')
    if (headerSchoolId && String(headerSchoolId) !== String(user.schoolId)) {
      return {
        isAuthenticated: false as const,
        user: undefined,
        response: secureJson(
          { error: 'Forbidden: school context mismatch', code: 'TENANT_HEADER_MISMATCH' },
          { status: 403 },
          request
        ),
      }
    }

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
  GUIDANCE_TEACHER: [
    'guidance',
    'guidance teacher',
    'guidance-teacher',
    'guidance_teacher',
    'career guidance',
  ],
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
