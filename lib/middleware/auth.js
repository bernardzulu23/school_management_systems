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
const ROLE_ALIASES = {
  ADMIN: ['headteacher', 'admin'],
  HOD: ['hod'],
  TEACHER: ['teacher'],
  STUDENT: ['student'],
}

export function roleCheck(user, allowedRoles) {
  if (!user || !user.role) return false
  const role = String(user.role).trim().toLowerCase()
  return allowedRoles.some((allowed) => {
    const aliases = ROLE_ALIASES[allowed] || [String(allowed).toLowerCase()]
    const lowerAliases = aliases.map((a) => String(a).toLowerCase())
    return lowerAliases.includes(role)
  })
}
