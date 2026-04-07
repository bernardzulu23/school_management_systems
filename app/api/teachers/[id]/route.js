import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

const parseClassNameParts = (className) => {
  const name = String(className || '').trim()
  if (!name) return { year_group: '', section: '' }
  const section = name.slice(-1)
  const year_group = name.slice(0, -1).trim()
  return { year_group, section }
}

export async function GET(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: params.id, schoolId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile_picture_url: true,
          contact_number: true,
          employeeId: true,
        },
      },
      classes: true,
      teachingAssignments: {
        include: {
          class: true,
          subject: true,
        },
      },
      departments: { include: { department: true } },
    },
  })

  if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Map user fields to top level
  const shaped = {
    ...teacher,
    name: teacher.user?.name ?? teacher.name,
    email: teacher.user?.email ?? null,
    profilePicture: teacher.user?.profile_picture_url ?? null,
    contactNumber: teacher.user?.contact_number ?? null,
    employeeId: teacher.user?.employeeId ?? null,
  }

  return NextResponse.json({ success: true, data: shaped })
}

export async function PUT(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const existing = await prisma.teacher.findFirst({
    where: { id: params.id, schoolId },
    select: { id: true, userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    if (body.user && existing.userId) {
      const userUpdates = {}
      if (body.user.name !== undefined) userUpdates.name = String(body.user.name)
      if (body.user.email !== undefined) userUpdates.email = String(body.user.email)
      if (body.user.contact_number !== undefined) {
        userUpdates.contact_number = String(body.user.contact_number)
      }
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdates,
        })
      }
    }

    const teacherUpdates = {}
    for (const key of ['department', 'specialization', 'ts_number', 'qualifications']) {
      if (body[key] !== undefined) teacherUpdates[key] = body[key]
    }

    const assignmentsRaw = Array.isArray(body.assignments) ? body.assignments : []
    const resolvedAssignments = []
    const classIds = new Set()
    const subjectIds = new Set()

    for (const a of assignmentsRaw) {
      const classId = a?.classId ? String(a.classId).trim() : ''
      const className = a?.className ? String(a.className).trim() : ''
      const subjectId = a?.subjectId ? String(a.subjectId).trim() : ''

      if (!subjectId) continue

      const subject = await tx.subject.findFirst({
        where: { id: subjectId, schoolId },
        select: { id: true, name: true },
      })
      if (!subject) continue

      const cls = classId
        ? await tx.class.findFirst({
            where: { id: classId, schoolId },
            select: { id: true, name: true },
          })
        : className
          ? await tx.class.upsert({
              where: { schoolId_name: { schoolId, name: className } },
              create: {
                schoolId,
                name: className,
                ...parseClassNameParts(className),
              },
              update: {},
              select: { id: true, name: true },
            })
          : null

      if (!cls) continue

      resolvedAssignments.push({
        schoolId,
        teacherId: existing.id,
        classId: cls.id,
        subjectId: subject.id,
      })
      classIds.add(cls.id)
      subjectIds.add(subject.id)
    }

    if (resolvedAssignments.length > 0) {
      await tx.teachingAssignment.deleteMany({
        where: { schoolId, teacherId: existing.id },
      })
      await tx.teachingAssignment.createMany({
        data: resolvedAssignments,
        skipDuplicates: true,
      })

      teacherUpdates.classes = {
        set: Array.from(classIds).map((id) => ({ id })),
      }

      const subjectNames = await tx.subject.findMany({
        where: { schoolId, id: { in: Array.from(subjectIds) } },
        select: { name: true },
      })
      teacherUpdates.assignedSubjects = Array.from(new Set(subjectNames.map((s) => s.name)))
    }

    const departmentIds = Array.isArray(body.departmentIds) ? body.departmentIds.map(String) : null
    if (departmentIds) {
      await tx.teacherDepartment.deleteMany({ where: { teacherId: existing.id } })
      if (departmentIds.length > 0) {
        await tx.teacherDepartment.createMany({
          data: Array.from(new Set(departmentIds)).map((departmentId) => ({
            teacherId: existing.id,
            departmentId,
          })),
          skipDuplicates: true,
        })
      }
    }

    await tx.teacher.update({
      where: { id: existing.id },
      data: teacherUpdates,
    })

    return tx.teacher.findFirst({
      where: { id: existing.id, schoolId },
      include: {
        user: true,
        classes: true,
        teachingAssignments: { include: { class: true, subject: true } },
        departments: { include: { department: true } },
      },
    })
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.teacher.findFirst({
    where: { id: params.id, schoolId },
    select: { id: true, userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.teachingAssignment.deleteMany({ where: { schoolId, teacherId: existing.id } })
    await tx.teacherDepartment.deleteMany({ where: { teacherId: existing.id } })
    await tx.teacher.update({
      where: { id: existing.id },
      data: { classes: { set: [] } },
    })
    await tx.teacher.delete({ where: { id: existing.id } })
    await tx.user.delete({ where: { id: existing.userId } })
  })

  return NextResponse.json({ success: true })
}
