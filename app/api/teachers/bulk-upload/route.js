export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getTenantClient } from '@/lib/prisma/tenantClient'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { parseTeacherExcel } from '@/lib/uploads/parseTeacherExcel'
import { teacherRowSchema, prepareTeacherRow } from '@/lib/uploads/teacherUploadSchema'
import { parseYearGroupSectionFromClassName } from '@/lib/services/registrationHelpers'
import { seedSubjectsForSchool } from '@/lib/subjects/seedSubjects'

export const runtime = 'nodejs'

const MAX_ROWS = 500

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

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let rows
  try {
    rows = parseTeacherExcel(buffer)
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

  const db = getTenantClient(schoolId)
  await seedSubjectsForSchool(db, { id: schoolId, level: 'combined' })

  const existingUsers = await db.user.findMany({
    where: { schoolId },
    select: { email: true },
  })
  const emailSet = new Set(existingUsers.map((r) => String(r.email).toLowerCase()))
  const seenEmails = new Set()

  const validRows = []
  const errorRows = []

  for (const row of rows) {
    const rowErrors = []
    const schemaResult = teacherRowSchema.safeParse(row)

    if (!schemaResult.success) {
      schemaResult.error.errors.forEach((e) => {
        rowErrors.push({ field: e.path.join('.') || 'row', error: e.message })
      })
    }

    let prepared = null
    try {
      if (schemaResult.success) {
        prepared = prepareTeacherRow(schemaResult.data)
      }
    } catch (err) {
      rowErrors.push({ field: 'row', error: err.message || 'Invalid row' })
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

    if (rowErrors.length === 0 && prepared) {
      seenEmails.add(emailLower)
      validRows.push({ ...prepared, _excelRow: row._excelRow })
    } else if (rowErrors.length > 0) {
      errorRows.push({
        excelRow: row._excelRow,
        full_name: row.full_name,
        email: row.email,
        errors: rowErrors,
      })
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
            role: 'teacher',
            schoolId,
            contact_number: row.contact_number || null,
            gender: row.gender || null,
            employeeId: row.employee_id || null,
            ...(row.date_of_birth
              ? { date_of_birth: new Date(`${row.date_of_birth}T00:00:00.000Z`) }
              : {}),
          },
        })

        const resolvedDepartmentIds = []
        for (const deptName of row.departmentNames) {
          const dept = await tx.department.upsert({
            where: { schoolId_name: { schoolId, name: deptName } },
            create: { schoolId, name: deptName },
            update: {},
            select: { id: true },
          })
          resolvedDepartmentIds.push(dept.id)
        }

        const teachingAssignments = []
        const classIdsToConnect = new Set()
        const subjectNamesFromAssignments = new Set()

        for (const pair of row.teachingPairs) {
          const parsedClass = parseYearGroupSectionFromClassName(pair.className)
          const classRecord = await tx.class.upsert({
            where: { schoolId_name: { schoolId, name: pair.className } },
            create: {
              schoolId,
              name: pair.className,
              year_group: parsedClass?.year_group || pair.className,
              section: parsedClass?.section || '',
            },
            update: {},
            select: { id: true },
          })

          const subjectRecord = await tx.subject.upsert({
            where: { schoolId_name: { schoolId, name: pair.subjectName } },
            create: { schoolId, name: pair.subjectName, topics: [] },
            update: {},
            select: { id: true, name: true },
          })

          teachingAssignments.push({
            schoolId,
            classId: classRecord.id,
            subjectId: subjectRecord.id,
          })
          classIdsToConnect.add(classRecord.id)
          subjectNamesFromAssignments.add(subjectRecord.name)
        }

        const assignedSubjectsMerged = Array.from(
          new Set([...row.assignedSubjectNames, ...subjectNamesFromAssignments].map(String))
        )

        await tx.teacher.create({
          data: {
            userId: user.id,
            schoolId,
            department: row.departmentNames[0] || null,
            ts_number: row.ts_number,
            qualifications: row.qualifications || null,
            specialization: row.specialization || null,
            assignedSubjects: assignedSubjectsMerged,
            classes:
              classIdsToConnect.size > 0
                ? { connect: Array.from(classIdsToConnect).map((id) => ({ id })) }
                : undefined,
            departments:
              resolvedDepartmentIds.length > 0
                ? {
                    createMany: {
                      data: Array.from(new Set(resolvedDepartmentIds)).map((departmentId) => ({
                        departmentId,
                      })),
                      skipDuplicates: true,
                    },
                  }
                : undefined,
            teachingAssignments:
              teachingAssignments.length > 0
                ? {
                    createMany: {
                      data: teachingAssignments,
                      skipDuplicates: true,
                    },
                  }
                : undefined,
          },
        })
      })
      insertedCount++
    } catch (dbErr) {
      if (dbErr?.code === 'P2002') {
        const target = String(dbErr?.meta?.target || '')
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
