export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { checkStudentCap } from '@/lib/middleware/individual-gate'
import { isPilotEmail } from '@/lib/services/registrationHelpers'
import { buildClassName } from '@/lib/services/registrationHelpers'
import { normalizeYearGroup } from '@/lib/services/registrationHelpers'
import { parseStudentExcel } from '@/lib/uploads/parseStudentExcel'
import {
  studentRowSchema,
  normalizeUploadYearGroup,
  parseSubjectNames,
  validateSubjectCount,
  prepareStudentRow,
} from '@/lib/uploads/studentUploadSchema'
import { seedSubjectsForSchool } from '@/lib/subjects/seedSubjects'

export const runtime = 'nodejs'

const MAX_ROWS = 1000

export const POST = withErrorHandler(async (request) => {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ success: false, error: 'School context required' }, { status: 400 })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, level: true, enabledLocalLanguages: true, plan: true, schoolType: true },
  })

  const isPilotUser = isPilotEmail(auth.user?.email)
  if (school?.plan === 'unpaid' && !isPilotUser && school?.schoolType !== 'INDIVIDUAL') {
    return NextResponse.json(
      {
        success: false,
        error: 'Student registration is disabled until the school activation fee is paid.',
        code: 'PAYMENT_REQUIRED',
      },
      { status: 402 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let rows
  try {
    rows = parseStudentExcel(buffer)
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to parse Excel file' },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No data rows found in file' },
      { status: 400 }
    )
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { success: false, error: `Maximum ${MAX_ROWS} rows per upload` },
      { status: 400 }
    )
  }

  const capCheck = await checkStudentCap(schoolId)
  if (!capCheck.allowed) return capCheck.response

  const db = getTenantClient(schoolId)
  await seedSubjectsForSchool(db, school || { id: schoolId, level: 'combined' })

  const schoolSubjects = await db.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true },
  })
  const subjectByName = Object.fromEntries(
    schoolSubjects.map((s) => [String(s.name).toLowerCase().trim(), s])
  )

  const [existingUsers, existingStudents] = await Promise.all([
    db.user.findMany({
      where: { schoolId },
      select: { email: true },
    }),
    db.student.findMany({
      where: { schoolId, exam_number: { not: null } },
      select: { exam_number: true },
    }),
  ])

  const emailSet = new Set(existingUsers.map((r) => String(r.email).toLowerCase()))
  const examSet = new Set(existingStudents.map((r) => String(r.exam_number)))

  const seenEmails = new Set()
  const seenExams = new Set()
  const validRows = []
  const errorRows = []

  for (const row of rows) {
    const rowErrors = []
    const schemaResult = studentRowSchema.safeParse(row)

    if (!schemaResult.success) {
      schemaResult.error.errors.forEach((e) => {
        rowErrors.push({ field: e.path.join('.') || 'row', error: e.message })
      })
    }

    let prepared = null
    try {
      if (schemaResult.success) {
        prepared = prepareStudentRow(schemaResult.data)
      }
    } catch {
      /* captured in schema errors */
    }

    const emailLower = String(row.email || '')
      .trim()
      .toLowerCase()
    if (emailLower) {
      if (emailSet.has(emailLower)) {
        rowErrors.push({ field: 'email', error: 'Email already exists in system' })
      } else if (seenEmails.has(emailLower)) {
        rowErrors.push({ field: 'email', error: 'Duplicate email in this upload file' })
      }
    }

    const examNum = String(row.exam_number || '').trim()
    if (examNum) {
      if (examSet.has(examNum)) {
        rowErrors.push({ field: 'exam_number', error: 'Exam number already exists in system' })
      } else if (seenExams.has(examNum)) {
        rowErrors.push({ field: 'exam_number', error: 'Duplicate exam number in this upload file' })
      }
    }

    if (prepared) {
      const subjectErrors = validateSubjectCount({
        subjectNames: prepared.subjectNames,
        yearGroup: prepared.year_group,
        schoolLevel: school?.level,
      })
      subjectErrors.forEach((msg) => rowErrors.push({ field: 'subjects', error: msg }))

      const matchedSubjects = []
      const unmatchedSubjects = []
      prepared.subjectNames.forEach((name) => {
        const match = subjectByName[name.toLowerCase()]
        if (match) matchedSubjects.push(match)
        else unmatchedSubjects.push(name)
      })

      if (unmatchedSubjects.length > 0) {
        rowErrors.push({
          field: 'subjects',
          error: `Subject(s) not found in school subject list: ${unmatchedSubjects.join(', ')}`,
        })
      }

      if (rowErrors.length === 0) {
        seenEmails.add(emailLower)
        seenExams.add(examNum)
        validRows.push({ ...prepared, matchedSubjects, _excelRow: row._excelRow })
      }
    }

    if (rowErrors.length > 0) {
      errorRows.push({
        excelRow: row._excelRow,
        full_name: row.full_name,
        email: row.email,
        errors: rowErrors,
      })
    }
  }

  if (capCheck.limit != null && Number.isFinite(capCheck.limit)) {
    const projected = (capCheck.count || 0) + validRows.length
    if (projected > capCheck.limit) {
      return NextResponse.json(
        {
          success: false,
          error: `Upload would exceed student limit (${capCheck.limit}). ${validRows.length} valid rows; ${capCheck.count || 0} already enrolled.`,
          code: 'STUDENT_CAP_REACHED',
        },
        { status: 402 }
      )
    }
  }

  let insertedCount = 0
  const hashed = await Promise.all(validRows.map((r) => bcrypt.hash(r.password, 12)))

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i]
    const hash = hashed[i]

    try {
      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: row.full_name,
            email: row.email,
            password: hash,
            role: 'student',
            schoolId,
            date_of_birth: new Date(`${row.date_of_birth}T00:00:00.000Z`),
            gender: row.gender,
          },
        })

        const className = buildClassName(row.year_group, row.section || 'A')
        const classRecord = await tx.class.upsert({
          where: { schoolId_name: { schoolId, name: className } },
          create: {
            schoolId,
            name: className,
            year_group: normalizeYearGroup(row.year_group) || className,
            section: String(row.section || 'A')
              .trim()
              .toUpperCase(),
          },
          update: {},
          select: { id: true, name: true },
        })

        const student = await tx.student.create({
          data: {
            userId: user.id,
            name: row.full_name,
            schoolId,
            classId: classRecord.id,
            class: classRecord.name,
            exam_number: row.exam_number,
            selected_subjects: row.subjectNames,
            parent_father_name: row.father_full_name || null,
            parent_father_contact: row.father_contact || null,
          },
        })

        if (row.matchedSubjects.length > 0) {
          await tx.pupilSubjectEnrollment.createMany({
            data: row.matchedSubjects.map((sub) => ({
              schoolId,
              pupilId: student.id,
              subjectId: sub.id,
              classId: classRecord.id,
            })),
            skipDuplicates: true,
          })
        }
      })
      insertedCount++
    } catch (dbErr) {
      if (dbErr?.code === 'P2002') {
        const target = String(dbErr?.meta?.target || '')
        if (target.includes('exam_number')) {
          errorRows.push({
            excelRow: row._excelRow,
            full_name: row.full_name,
            email: row.email,
            errors: [{ field: 'exam_number', error: 'Exam number already exists in this school' }],
          })
          continue
        }
        if (target.includes('email')) {
          errorRows.push({
            excelRow: row._excelRow,
            full_name: row.full_name,
            email: row.email,
            errors: [{ field: 'email', error: 'Email already exists in this school' }],
          })
          continue
        }
      }
      errorRows.push({
        excelRow: row._excelRow,
        full_name: row.full_name,
        email: row.email,
        errors: [{ field: 'database', error: dbErr?.message || 'Database error' }],
      })
    }
  }

  return NextResponse.json({
    success: true,
    totalRows: rows.length,
    insertedCount,
    errorCount: errorRows.length,
    errors: errorRows,
  })
})
