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

      const className = `${body.year_group || ''}${body.section || ''}`.trim()

      const student = await tx.student.create({
        data: {
          userId: user.id,
          name: user.name,
          schoolId,
          class: className,
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

      if (className) {
        const classRecord = await tx.class.upsert({
          where: { schoolId_name: { schoolId, name: className } },
          create: {
            schoolId,
            name: className,
            year_group: String(body.year_group || '').trim() || className,
            section: String(body.section || '').trim() || '',
          },
          update: {},
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
      }
    } else if (role === 'teacher') {
      const teachingAssignmentsRaw = Array.isArray(body.teaching_assignments)
        ? body.teaching_assignments
        : []

      const assignedSubjects = Array.isArray(body.assigned_subjects)
        ? body.assigned_subjects.map(String)
        : []

      const resolvedDepartmentIds = []
      const rawDepartmentIds = Array.isArray(body.department_ids)
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
                  year_group: className.match(/^(\d{1,2})[A-Za-z]$/)
                    ? `Grade ${className.match(/^(\d{1,2})[A-Za-z]$/)[1]}`
                    : className,
                  section: className.match(/^[0-9]{1,2}([A-Za-z])$/)
                    ? className.match(/^[0-9]{1,2}([A-Za-z])$/)[1].toUpperCase()
                    : '',
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
    } else if (role === 'hod') {
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
          departmentId: dept?.id ?? undefined,
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
