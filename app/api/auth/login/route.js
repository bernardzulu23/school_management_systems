import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { loginSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { findUserByEmail } from '@/lib/db/queries'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

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
    const body = await request.json()

    // 1. Input Validation
    const validation = await validateRequest(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // 2. Resolve school for multi-tenant lookup
    const schoolId = await getSchoolIdFromRequest(request)
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
    const user = await findUserByEmail(schoolId, email)

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
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' })

    const cookieStore = cookies()

    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    // 5. Sanitize Output
    const sanitizedUser = sanitizeOutput({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      profile_picture_url: user.profile_picture_url,
    })

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
    })
  } catch (error) {
    // 6. Secure Error Handling
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
