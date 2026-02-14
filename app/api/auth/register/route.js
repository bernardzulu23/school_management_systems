import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { registerSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const POST = withErrorHandler(async (request) => {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json(
      { success: false, message: 'Only administrators can register new users' },
      { status: 403 }
    )
  }

  const data = await request.json()

  // 1. Input Validation
  const validation = await validateRequest(registerSchema, data)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: 'Validation failed', details: validation.errors },
      { status: 400 }
    )
  }

  const { name, email, password, role } = validation.data

  // 2. Resolve schoolId for multi-tenant isolation
  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json(
      { success: false, message: 'School context required' },
      { status: 400 }
    )
  }

  // 3. Check if user already exists (scoped by school)
  const existingUser = await prisma.user.findUnique({
    where: { schoolId_email: { schoolId, email } },
  })

  if (existingUser) {
    return NextResponse.json(
      { success: false, message: 'User with this email already exists in this school' },
      { status: 400 }
    )
  }

  // 4. Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // 5. Create user (scoped by schoolId)
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      schoolId,
    },
  })

  // 6. Sanitize and return
  const sanitizedUser = sanitizeOutput({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  })

  return NextResponse.json({
    success: true,
    message: 'User registered successfully',
    user: sanitizedUser
  })
})
