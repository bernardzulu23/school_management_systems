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
      {
        success: false,
        message: `Only administrators can register new users. Your role: ${auth.user?.role}`,
      },
      { status: 403 }
    )
  }

  const body = await request.json()

  // 1. Input Validation (Base Fields)
  const validation = await validateRequest(registerSchema, body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: 'Validation failed', details: validation.errors },
      { status: 400 }
    )
  }

  const { name, email, password, role } = validation.data

  // 2. Resolve schoolId
  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json(
      { success: false, message: 'School context required' },
      { status: 400 }
    )
  }

  // 3. Check duplicate
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

  // 5. Create User & Profile (Transaction)
  const newUser = await prisma.$transaction(async (tx) => {
    // Create User Record
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        schoolId,
        contact_number: body.contact_number,
        date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : undefined,
        gender: body.gender,
        employeeId: body.employee_id, // Map employee_id if provided
      },
    })

    // Create Role-Specific Profile
    if (role === 'student') {
      const selectedSubjects = Array.isArray(body.selected_subjects)
        ? body.selected_subjects.map(String)
        : []

      await tx.student.create({
        data: {
          userId: user.id,
          name: user.name,
          schoolId,
          class: `${body.year_group || ''} ${body.section || ''}`.trim(),
          exam_number: body.exam_number,
          previous_school: body.previous_school,
          selected_subjects: selectedSubjects,

          // Parents
          parent_father_name: body.parent_father_name,
          parent_father_contact: body.parent_father_contact,
          parent_father_email: body.parent_father_email,
          parent_mother_name: body.parent_mother_name,
          parent_mother_contact: body.parent_mother_contact,

          // Emergency
          emergency_contact_name: body.emergency_contact_name,
          emergency_contact_phone: body.emergency_contact_phone,

          // Medical
          blood_type: body.blood_type,
          medical_aid_scheme: body.medical_aid_scheme,
          allergies: body.allergies,
          medical_conditions: body.medical_conditions,
        },
      })
    } else if (role === 'teacher') {
      await tx.teacher.create({
        data: {
          userId: user.id,
          schoolId,
          department: body.department,
          ts_number: body.ts_number,
          qualifications: body.qualifications,
          specialization: body.specialization,
        },
      })
    } else if (role === 'hod') {
      await tx.headOfDepartment.create({
        data: {
          userId: user.id,
          schoolId,
          department: body.department,
        },
      })
    }

    return user
  })

  // 6. Sanitize and return
  const sanitizedUser = sanitizeOutput({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  })

  return NextResponse.json({
    success: true,
    message: 'User registered successfully',
    user: sanitizedUser,
  })
})
