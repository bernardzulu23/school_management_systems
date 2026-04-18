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
  ADMIN: ['headteacher', 'admin', 'administrator', 'superadmin'],
  HOD: ['hod', 'head of department'],
  TEACHER: ['teacher'],
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

export function roleCheck(user, allowedRoles) {
  if (!user || !user.role) return false
  const role = normalizeRole(user.role)
  return allowedRoles.some((allowed) => {
    const aliases = ROLE_ALIASES[allowed] || [normalizeRole(allowed)]
    const lowerAliases = aliases.map((a) => normalizeRole(a))
    return lowerAliases.includes(role)
  })
}

export async function getAuthUser(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return null
  return auth.user || null
}
