import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET && !process.env.NEXT_PHASE) {
  console.warn('Warning: JWT_SECRET is not set in production environment.')
}

export function authMiddleware(request) {
  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return {
      isAuthenticated: false,
      response: NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 }),
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return {
      isAuthenticated: true,
      user: decoded,
    }
  } catch (error) {
    return {
      isAuthenticated: false,
      response: NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 }),
    }
  }
}

/** Role aliases: schema uses lowercase (headteacher, hod, teacher, student) */
export const ROLE_ALIASES = {
  ADMIN: [
    'headteacher',
    'admin',
    'administrator',
    'superadmin',
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

export function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
}

function normalizeRoleKey(role) {
  return normalizeRole(role).replace(/[^a-z0-9]+/g, '')
}

export function roleCheck(user, allowedRoles) {
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

export async function getAuthUser(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return null
  return auth.user || null
}
