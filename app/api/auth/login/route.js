import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { loginSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { findUserByEmail } from '@/lib/db/queries'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-fallback'
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) &&
  !process.env.NEXT_PHASE
) {
  console.warn('Warning: JWT secrets are not set in production environment.')
}

export async function POST(request) {
  try {
    const host = request.headers.get('host') || ''
    const hostName = String(host || '')
      .split(':')[0]
      .toLowerCase()
    const cookieDomain = (() => {
      const configured = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : ''
      if (!configured) return undefined
      if (!hostName || hostName === 'localhost' || /^[0-9.]+$/.test(hostName)) return undefined
      const normalized = configured.startsWith('.') ? configured.slice(1) : configured
      if (!hostName.endsWith(normalized)) return undefined
      return configured.startsWith('.') ? configured : `.${configured}`
    })()
    let body = await request.json()
    console.log('[Login Debug] Request Body:', { email: body.email }) // Log email only for safety

    const { subdomain: subdomainFromBody } = body
    // If subdomain is in the body, set x-school-subdomain header so getSchoolIdFromRequest finds it
    if (subdomainFromBody) {
      const headers = new Headers(request.headers)
      headers.set('x-school-subdomain', subdomainFromBody)
      request = new Request(request, { headers, body: JSON.stringify(body) })
    }

    // 1. Input Validation
    const validation = await validateRequest(loginSchema, body)
    if (!validation.success) {
      console.log('[Login Debug] Validation Failed:', validation.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password, subdomain } = validation.data
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()
    // Note: 'subdomain' is optional in schema, but passed from frontend if available

    const rateLimitResult = rateLimiter(request, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
      keyPrefix: 'auth_login_',
      keyGenerator: ({ ip }) => `${ip}-${normalizedEmail}`,
    })
    if (rateLimitResult.isLimited) return rateLimitResult.response

    // 2. Resolve school for multi-tenant lookup
    let schoolId = await getSchoolIdFromRequest(request, subdomain)
    console.log('[Login Debug] Resolved School ID:', schoolId)

    // Dev-friendly fallback: on localhost there's no subdomain, so infer school from email.
    // This also handles when the fallback schoolId doesn't contain the user
    if (process.env.NODE_ENV !== 'production') {
      const userSchool = await prisma.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          school: { active: true },
        },
        select: { schoolId: true },
      })
      if (userSchool?.schoolId) {
        schoolId = userSchool.schoolId
        console.log('[Login Debug] Inferred School ID (dev fallback):', schoolId)
      }
    }

    // For production, strictly require school context for security in multi-tenant setup
    if (!schoolId) {
      console.error(
        'Login error: School context could not be determined. Host:',
        request.headers.get('host')
      )
      return NextResponse.json(
        { error: 'School context could not be determined. Please access via your school URL.' },
        { status: 400 }
      )
    }

    // 3. Database Lookup (Parameterized via Prisma, scoped by schoolId)
    const user = await findUserByEmail(schoolId, normalizedEmail)

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // 3. Password Verification
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // 4. Token Generation & Cookie Setting (include schoolId for multi-tenant isolation)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    const refreshToken = jwt.sign({ id: user.id, schoolId: user.schoolId }, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    })

    // 5. Sanitize Output
    const sanitizedUser = sanitizeOutput({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      profile_picture_url: user.profile_picture_url,
      department: user?.hodProfile?.department || undefined,
    })

    const response = NextResponse.json({
      success: true,
      user: sanitizedUser,
    })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    return response
  } catch (error) {
    // 6. Secure Error Handling
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
