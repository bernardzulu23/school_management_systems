import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { registerSchema, validateRequest, sanitizeOutput } from '@/lib/middleware/inputValidation'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

const parseYearGroupSectionFromClassName = (className) => {
  const raw = String(className || '').trim()
  if (!raw) return { year_group: '', section: '' }

  const numeric = raw.match(/^(\d{1,2})([A-Za-z])$/)
  if (numeric) {
    return { year_group: `Grade ${numeric[1]}`, section: numeric[2].toUpperCase() }
  }

  const last = raw.slice(-1)
  if (/[A-Za-z]/.test(last) && raw.length > 1) {
    return { year_group: raw.slice(0, -1).trim(), section: last.toUpperCase() }
  }

  return { year_group: raw, section: '' }
}

const normalizeYearGroup = (yearGroupRaw) => {
  const raw = String(yearGroupRaw || '').trim()
  if (!raw) return ''
  const numeric = raw.match(/^(\d{1,2})$/)
  if (numeric) return `Grade ${Number(numeric[1])}`
  const grade = raw.match(/^grade\s*(\d{1,2})$/i)
  if (grade) return `Grade ${Number(grade[1])}`
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
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()

  // 2. Resolve schoolId
  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json(
      { success: false, message: 'School context required' },
      { status: 400 }
    )
  }

  if (body.schoolId && String(body.schoolId) !== String(schoolId)) {
    return NextResponse.json({ success: false, message: 'Invalid school context' }, { status: 400 })
  }

  // 3. Check duplicate
  const existingUser = await prisma.user.findFirst({
    where: {
      schoolId,
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
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
  let newUser
  try {
    newUser = await prisma.$transaction(async (tx) => {
      // Create User Record
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
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

        const incomingClassId = body.classId ? String(body.classId).trim() : ''
        const fallbackClassName = buildClassName(body.year_group, body.section)

        const classRecord = incomingClassId
          ? await tx.class.findFirst({
              where: { id: incomingClassId, schoolId },
            })
          : fallbackClassName
            ? await tx.class.upsert({
                where: { schoolId_name: { schoolId, name: fallbackClassName } },
                create: {
                  schoolId,
                  name: fallbackClassName,
                  year_group: normalizeYearGroup(body.year_group) || fallbackClassName,
                  section:
                    String(body.section || '')
                      .trim()
                      .toUpperCase() || '',
                },
                update: {},
              })
            : null

        if (!classRecord) {
          throw new Error('Class is required')
        }

        const student = await tx.student.create({
          data: {
            userId: user.id,
            name: user.name,
            schoolId,
            classId: classRecord.id,
            class: classRecord.name,
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

            // Medical (optional)
            blood_type: body.blood_type,
            medical_aid_scheme: body.medical_aid_scheme,
            allergies: body.allergies,
            medical_conditions: body.medical_conditions,
          },
        })

        if (selectedSubjects.length > 0) {
          const subjectRecords = await Promise.all(
            selectedSubjects.map((subjectName) =>
              tx.subject.upsert({
                where: {
                  schoolId_name: {
                    schoolId,
                    name: subjectName,
                  },
                },
                create: {
                  schoolId,
                  name: subjectName,
                  topics: [],
                },
                update: {},
              })
            )
          )

          await tx.pupilSubjectEnrollment.createMany({
            data: subjectRecords.map((sub) => ({
              schoolId,
              pupilId: student.id,
              subjectId: sub.id,
              classId: classRecord.id,
            })),
            skipDuplicates: true,
          })
        }
      } else if (role === 'teacher') {
        const teachingAssignmentsRaw = Array.isArray(body.assignments)
          ? body.assignments
          : Array.isArray(body.teaching_assignments)
            ? body.teaching_assignments
            : []

        const assignedSubjects = Array.isArray(body.assigned_subjects)
          ? body.assigned_subjects.map(String)
          : []

        const resolvedDepartmentIds = []
        const rawDepartmentIds = Array.isArray(body.departmentIds)
          ? body.departmentIds.map(String)
          : Array.isArray(body.department_ids)
            ? body.department_ids.map(String)
            : []

        if (rawDepartmentIds.length > 0) {
          for (const rawId of rawDepartmentIds) {
            const existing = await tx.department.findFirst({
              where: { id: rawId, schoolId },
              select: { id: true },
            })
            if (existing) {
              resolvedDepartmentIds.push(existing.id)
              continue
            }

            const name = String(rawId).trim()
            if (!name) continue
            const created = await tx.department.upsert({
              where: { schoolId_name: { schoolId, name } },
              create: { schoolId, name },
              update: {},
              select: { id: true },
            })
            resolvedDepartmentIds.push(created.id)
          }
        } else {
          const departmentName = String(body.department || '').trim()
          if (departmentName) {
            const dept = await tx.department.upsert({
              where: { schoolId_name: { schoolId, name: departmentName } },
              create: { schoolId, name: departmentName },
              update: {},
              select: { id: true },
            })
            resolvedDepartmentIds.push(dept.id)
          }
        }

        const teachingAssignments = []
        const classIdsToConnect = new Set()
        const subjectIdsToFetch = new Set()

        for (const ta of teachingAssignmentsRaw) {
          const classId = ta?.classId ? String(ta.classId).trim() : ''
          const className = ta?.className ? String(ta.className).trim() : ''
          const subjectId = ta?.subjectId ? String(ta.subjectId).trim() : ''
          const subjectName = ta?.subjectName ? String(ta.subjectName).trim() : ''

          const parsedClass = className ? parseYearGroupSectionFromClassName(className) : null

          const resolvedClass = classId
            ? await tx.class.findFirst({
                where: { id: classId, schoolId },
                select: { id: true },
              })
            : className
              ? await tx.class.upsert({
                  where: { schoolId_name: { schoolId, name: className } },
                  create: {
                    schoolId,
                    name: className,
                    year_group: parsedClass?.year_group || className,
                    section: parsedClass?.section || '',
                  },
                  update: {},
                  select: { id: true },
                })
              : null

          const resolvedSubject = subjectId
            ? await tx.subject.findFirst({
                where: { id: subjectId, schoolId },
                select: { id: true },
              })
            : subjectName
              ? await tx.subject.upsert({
                  where: { schoolId_name: { schoolId, name: subjectName } },
                  create: {
                    schoolId,
                    name: subjectName,
                    topics: [],
                  },
                  update: {},
                  select: { id: true },
                })
              : null

          if (classId && !resolvedClass) throw new Error('Invalid classId')
          if (subjectId && !resolvedSubject) throw new Error('Invalid subjectId')

          if (!resolvedClass || !resolvedSubject) continue

          teachingAssignments.push({
            schoolId,
            classId: resolvedClass.id,
            subjectId: resolvedSubject.id,
          })
          classIdsToConnect.add(resolvedClass.id)
          subjectIdsToFetch.add(resolvedSubject.id)
        }

        const subjectNamesFromAssignments =
          subjectIdsToFetch.size > 0
            ? (
                await tx.subject.findMany({
                  where: { schoolId, id: { in: Array.from(subjectIdsToFetch) } },
                  select: { name: true },
                })
              ).map((s) => s.name)
            : []

        const assignedSubjectsMerged = Array.from(
          new Set([...assignedSubjects, ...subjectNamesFromAssignments].map(String))
        )

        const teacher = await tx.teacher.create({
          data: {
            userId: user.id,
            schoolId,
            department: String(body.department || '').trim() || null,
            ts_number: body.ts_number,
            qualifications: body.qualifications,
            specialization: body.specialization,
            assignedSubjects: assignedSubjectsMerged,
            classes:
              classIdsToConnect.size > 0
                ? {
                    connect: Array.from(classIdsToConnect).map((id) => ({ id })),
                  }
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

        if (!teacher) throw new Error('Failed to create teacher profile')
      } else if (role.toLowerCase() === 'hod' || role.toLowerCase() === 'head of department') {
        const departmentName = String(body.department || '').trim()
        const dept =
          departmentName.length > 0
            ? await tx.department.upsert({
                where: {
                  schoolId_name: {
                    schoolId,
                    name: departmentName,
                  },
                },
                create: {
                  schoolId,
                  name: departmentName,
                },
                update: {},
              })
            : null

        await tx.headOfDepartment.create({
          data: {
            userId: user.id,
            schoolId,
            department: departmentName,
            departmentId: dept?.id ?? null,
          },
        })
      }

      return user
    })
  } catch (error) {
    const msg = String(error?.message || '')
    const code = error?.code
    const looksLikeMissingMigration =
      code === 'P2021' ||
      code === 'P2022' ||
      msg.toLowerCase().includes('does not exist') ||
      msg.toLowerCase().includes('column') ||
      msg.toLowerCase().includes('relation') ||
      msg.toLowerCase().includes('pupilsubjectenrollment') ||
      msg.toLowerCase().includes('teachingassignment') ||
      msg.toLowerCase().includes('teacherdepartment')

    if (looksLikeMissingMigration) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database schema out of date',
          message:
            'Database migrations have not been applied. Redeploy the service so prisma migrate deploy runs, or run `npx prisma migrate deploy` against the production database.',
        },
        { status: 500 }
      )
    }
    throw error
  }

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
