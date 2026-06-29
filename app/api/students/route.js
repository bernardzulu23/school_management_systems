export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/prisma/client'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import {
  findStudentByUserId,
  findStudentsByClass,
  findStudentsByClassNames,
  searchStudents,
} from '@/lib/db/queries'
import bcrypt from 'bcryptjs'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { studentSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'

const normalizeYearGroup = (yearGroupRaw) => {
  const raw = String(yearGroupRaw || '').trim()
  if (!raw) return ''
  const numeric = raw.match(/^(\d{1,2})$/)
  if (numeric) return `Grade ${Number(numeric[1])}`
  const grade = raw.match(/^grade\s*(\d{1,2})$/i)
  if (grade) return `Grade ${Number(grade[1])}`
  const form = raw.match(/^form\s*([1-6])$/i)
  if (form) return `Form ${Number(form[1])}`
  return raw
}

const buildClassName = (yearGroupRaw, sectionRaw) => {
  const yearGroup = normalizeYearGroup(yearGroupRaw)
  const section = String(sectionRaw || '')
    .trim()
    .toUpperCase()
  if (!yearGroup) return section ? section : ''
  if (!section) return yearGroup
  return `${yearGroup}${section}`
}

const parseYearGroupSectionFromClassName = (className) => {
  const raw = String(className || '').trim()
  if (!raw) return { year_group: '', section: '' }

  const numeric = raw.match(/^(\d{1,2})([A-Za-z])$/)
  if (numeric) {
    return { year_group: `Grade ${Number(numeric[1])}`, section: numeric[2].toUpperCase() }
  }

  const grade = raw.match(/^grade\s*(\d{1,2})\s*([A-Za-z])?$/i)
  if (grade) {
    return {
      year_group: `Grade ${Number(grade[1])}`,
      section: String(grade[2] || '').toUpperCase(),
    }
  }

  const form = raw.match(/^form\s*([1-6])\s*([A-Za-z])?$/i)
  if (form) {
    return { year_group: `Form ${Number(form[1])}`, section: String(form[2] || '').toUpperCase() }
  }

  const last = raw.slice(-1)
  if (/[A-Za-z]/.test(last) && raw.length > 1) {
    return { year_group: raw.slice(0, -1).trim(), section: last.toUpperCase() }
  }

  return { year_group: raw, section: '' }
}

export const GET = withErrorHandler(async (request) => {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  try {
    await basePrisma.$queryRaw`SELECT 1`
  } catch (dbError) {
    const sanitizeErrorDetails = (value) =>
      String(value || '')
        .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
        .replace(/password=[^&\s]+/gi, 'password=***')
        .slice(0, 2000)

    const code = dbError?.code || dbError?.name || 'UNKNOWN'
    return NextResponse.json(
      {
        success: false,
        error: 'Database unavailable',
        code,
        hint: 'Check DATABASE_URL and Prisma adapter configuration',
        details: sanitizeErrorDetails(dbError?.message || dbError),
      },
      { status: 503, headers: { 'x-error-code': String(code) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const classId = safeQueryString(searchParams.get('classId'))
  const className = safeQueryString(searchParams.get('class'))
  const q = safeQueryString(searchParams.get('q') || searchParams.get('search'), {
    defaultValue: '',
  })
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit'), 10) || 20))

  // Authorization: Only Admin, HOD, and Teacher can view all students or specific classes
  // Students can only view their own record (handled in a separate specific route or filtered here)
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    // If student, filter to only show themselves
    if (roleCheck(auth.user, ['STUDENT', 'student'])) {
      const student = await findStudentByUserId(auth.user.id)
      return NextResponse.json({ success: true, data: student ? [sanitizeOutput(student)] : [] })
    }
    throw new ApiError('Forbidden: Insufficient permissions', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)
  const db = getTenantClient(schoolId)

  if (q) {
    const { students, total } = await searchStudents(schoolId, q, { page, limit })
    return NextResponse.json({
      success: true,
      data: students.map((s) => sanitizeOutput(s)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  }

  let resolvedClassName = className ? String(className) : null
  let classCandidates = []
  if (!resolvedClassName && classId) {
    const cls = await db.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, name: true, year_group: true, section: true },
    })
    resolvedClassName = cls?.name || null
    if (cls) {
      const yearGroup = String(cls.year_group || '').trim()
      const section = String(cls.section || '').trim()
      const compact = `${yearGroup}${section}`.trim()
      const spaced = `${yearGroup} ${section}`.trim()
      classCandidates = [
        cls.name,
        cls.id,
        yearGroup,
        compact,
        spaced,
        String(cls.name || '').replace(/\s+/g, ''),
      ]
    }
  } else if (resolvedClassName) {
    const cls = await db.class.findFirst({
      where: { schoolId, name: { equals: resolvedClassName, mode: 'insensitive' } },
      select: { id: true, name: true, year_group: true, section: true },
    })
    if (cls) {
      const yearGroup = String(cls.year_group || '').trim()
      const section = String(cls.section || '').trim()
      const compact = `${yearGroup}${section}`.trim()
      const spaced = `${yearGroup} ${section}`.trim()
      classCandidates = [
        cls.name,
        cls.id,
        yearGroup,
        compact,
        spaced,
        String(cls.name || '').replace(/\s+/g, ''),
        resolvedClassName,
      ]
    } else {
      classCandidates = [resolvedClassName]
    }
  }

  const { students, total } =
    classCandidates.length > 0
      ? await findStudentsByClassNames(schoolId, classCandidates, classId || null, page, limit)
      : await findStudentsByClass(schoolId, resolvedClassName, page, limit)

  return NextResponse.json({
    success: true,
    data: students.map((s) => sanitizeOutput(s)),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const POST = withErrorHandler(async (request) => {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  // Authorization: Only Admin and HOD can create students
  if (!roleCheck(auth.user, ['ADMIN', 'HOD', 'headteacher', 'hod'])) {
    throw new ApiError('Forbidden: Only Admin or HOD can create students', 403)
  }

  const body = await request.json()
  const validation = await validateRequest(studentSchema, body)
  if (!validation.success) {
    return NextResponse.json({ success: false, errors: validation.errors }, { status: 400 })
  }

  const studentData = validation.data

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  // Use a secure random password for initial creation instead of hardcoded 'password123'
  // In a real app, this would trigger a password reset email
  const { generateCompliantPassword } = await import('@/lib/security/passwordPolicy')
  const tempPassword = generateCompliantPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const { checkStudentCap } = await import('@/lib/middleware/individual-gate')
  const capCheck = await checkStudentCap(schoolId)
  if (!capCheck.allowed) return capCheck.response

  const db = getTenantClient(schoolId)

  const result = await db.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { schoolId_email: { schoolId, email: studentData.email } },
    })
    if (existingUser) throw new ApiError('User with this email already exists in this school', 400)

    const user = await tx.user.create({
      data: {
        name: studentData.name,
        email: studentData.email,
        role: 'student',
        password: hashedPassword,
        schoolId,
      },
    })

    const safeClassId = safeStringId(studentData.class_id)
    const classRecord = await tx.class.findFirst({
      where: {
        schoolId,
        OR: [
          ...(safeClassId ? [{ id: safeClassId }] : []),
          { name: String(studentData.class_id || '') },
        ],
      },
      select: { id: true, name: true },
    })

    const parsedClass = parseYearGroupSectionFromClassName(studentData.class_id)
    const derivedClassName =
      buildClassName(parsedClass.year_group, parsedClass.section) || studentData.class_id

    const ensuredClass =
      classRecord ||
      (studentData.class_id
        ? await tx.class.upsert({
            where: {
              schoolId_name: {
                schoolId,
                name: derivedClassName,
              },
            },
            create: {
              schoolId,
              name: derivedClassName,
              year_group: normalizeYearGroup(parsedClass.year_group || derivedClassName),
              section: parsedClass.section,
            },
            update: {},
            select: { id: true, name: true },
          })
        : null)

    const selectedRaw = Array.isArray(studentData.selected_subjects)
      ? studentData.selected_subjects.map((s) => String(s).trim()).filter(Boolean)
      : []

    const subjectRecords =
      selectedRaw.length > 0
        ? await tx.subject.findMany({
            where: {
              schoolId,
              OR: [{ id: { in: selectedRaw } }, { name: { in: selectedRaw } }],
            },
            select: { id: true, name: true },
          })
        : []

    const selectedSubjectNames = Array.from(
      new Set([
        ...subjectRecords.map((s) => s.name),
        ...selectedRaw.filter((s) => !subjectRecords.some((r) => r.id === s)),
      ])
    )

    const student = await tx.student.create({
      data: {
        userId: user.id,
        schoolId,
        name: studentData.name,
        ...(ensuredClass?.id ? { classId: ensuredClass.id } : {}),
        class: ensuredClass?.name || studentData.class_id,
        ...(studentData.student_id && { id: studentData.student_id }),
        selected_subjects: selectedSubjectNames,
      },
    })

    // Create PupilSubjectEnrollment records
    if (subjectRecords.length > 0 && ensuredClass?.id) {
      await tx.pupilSubjectEnrollment.createMany({
        data: subjectRecords.map((sub) => ({
          schoolId,
          pupilId: student.id,
          subjectId: sub.id,
          classId: ensuredClass.id,
        })),
        skipDuplicates: true,
      })
    }

    return { ...student, user }
  })

  return NextResponse.json({
    success: true,
    message: 'Student created successfully. A temporary password has been generated.',
    data: sanitizeOutput(result),
  })
})
