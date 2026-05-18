export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck, ROLE_GROUPS } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId')

  if (!roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    return NextResponse.json({ success: true, data: [] })
  }

  let resolvedTeacherId = teacherId
  if (!resolvedTeacherId && roleCheck(auth.user, ROLE_GROUPS.SCHOOL_STAFF)) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: auth.user.id },
      select: { id: true },
    })
    resolvedTeacherId = teacher?.id || null
  }

  if (!resolvedTeacherId) {
    return NextResponse.json({ error: 'teacherId is required', data: [] }, { status: 400 })
  }

  if (
    !roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'TEACHER', 'teacher', 'hod']) &&
    !(roleCheck(auth.user, ['TEACHER', 'teacher']) && auth.user.id)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where: {
      schoolId,
      teacherId: resolvedTeacherId,
    },
    include: {
      class: true,
      subject: true,
      teacher: {
        include: { user: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (assignments.length === 0) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: resolvedTeacherId, schoolId },
      include: {
        user: { select: { name: true } },
        classes: true,
        subjects: true,
      },
    })

    const assignedSubjectNames = Array.isArray(teacher?.assignedSubjects)
      ? teacher.assignedSubjects.map(String).filter(Boolean)
      : []

    const subjectById = new Map((teacher?.subjects || []).map((s) => [String(s.id), s]))

    if (assignedSubjectNames.length > 0) {
      const subjectsByName = await prisma.subject.findMany({
        where: {
          schoolId,
          OR: [{ name: { in: assignedSubjectNames } }, { id: { in: assignedSubjectNames } }],
        },
      })
      subjectsByName.forEach((s) => {
        if (s?.id) subjectById.set(String(s.id), s)
      })
    }

    const classes = teacher?.classes || []
    const subjects = Array.from(subjectById.values())

    const virtual = []
    const subjectClassIds = Array.from(
      new Set(subjects.map((s) => String(s?.classId || '')).filter(Boolean))
    )
    const subjectClasses =
      subjectClassIds.length > 0
        ? await prisma.class.findMany({
            where: { schoolId, id: { in: subjectClassIds } },
          })
        : []
    const classById = new Map(subjectClasses.map((c) => [String(c.id), c]))

    const resolvedClasses = classes.length > 0 ? classes : subjectClasses

    for (const s of subjects) {
      const preferredClassId = s?.classId ? String(s.classId) : ''
      const preferredClass = preferredClassId ? classById.get(preferredClassId) : null
      if (preferredClass) {
        virtual.push({
          id: `virtual:${String(preferredClass.id)}:${String(s.id)}`,
          teacherId: resolvedTeacherId,
          teacherName: teacher?.user?.name || null,
          classId: preferredClass.id,
          className: preferredClass.name || 'Unknown Class',
          classYearGroup: preferredClass.year_group || null,
          subjectId: s.id,
          subjectName: s.name || 'Unknown Subject',
          createdAt: null,
        })
        continue
      }
      for (const c of resolvedClasses) {
        virtual.push({
          id: `virtual:${String(c.id)}:${String(s.id)}`,
          teacherId: resolvedTeacherId,
          teacherName: teacher?.user?.name || null,
          classId: c.id,
          className: c.name || 'Unknown Class',
          classYearGroup: c.year_group || null,
          subjectId: s.id,
          subjectName: s.name || 'Unknown Subject',
          createdAt: null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: virtual,
    })
  }

  return NextResponse.json({
    success: true,
    data: assignments.map((a) => ({
      id: a.id,
      teacherId: a.teacherId,
      teacherName: a.teacher?.user?.name || 'Unknown Teacher',
      classId: a.classId,
      className: a.class?.name || 'Unknown Class',
      classYearGroup: a.class?.year_group || null,
      subjectId: a.subjectId,
      subjectName: a.subject?.name || 'Unknown Subject',
      createdAt: a.createdAt,
    })),
  })
}

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json()
  const teacherId = body.teacherId
  const classId = body.classId
  const subjectId = body.subjectId
  const className = body.className
  const subjectName = body.subjectName

  if (!teacherId) return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })

  const [teacher, resolvedClass, resolvedSubject] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true },
    }),
    classId
      ? prisma.class.findFirst({
          where: { id: classId, schoolId },
          select: { id: true },
        })
      : className
        ? prisma.class.upsert({
            where: { schoolId_name: { schoolId, name: String(className).trim() } },
            create: {
              schoolId,
              name: String(className).trim(),
              year_group: String(body.year_group || '').trim() || String(className).trim(),
              section: String(body.section || '').trim() || '',
            },
            update: {},
            select: { id: true },
          })
        : Promise.resolve(null),
    subjectId
      ? prisma.subject.findFirst({
          where: { id: subjectId, schoolId },
          select: { id: true },
        })
      : subjectName
        ? prisma.subject.upsert({
            where: { schoolId_name: { schoolId, name: String(subjectName).trim() } },
            create: {
              schoolId,
              name: String(subjectName).trim(),
              topics: [],
            },
            update: {},
            select: { id: true },
          })
        : Promise.resolve(null),
  ])

  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  if (!resolvedClass)
    return NextResponse.json({ error: 'classId or className required' }, { status: 400 })
  if (!resolvedSubject)
    return NextResponse.json({ error: 'subjectId or subjectName required' }, { status: 400 })

  const assignment = await prisma.teachingAssignment.upsert({
    where: {
      schoolId_teacherId_subjectId_classId: {
        schoolId,
        teacherId: teacher.id,
        subjectId: resolvedSubject.id,
        classId: resolvedClass.id,
      },
    },
    create: {
      schoolId,
      teacherId: teacher.id,
      subjectId: resolvedSubject.id,
      classId: resolvedClass.id,
    },
    update: {},
    include: {
      class: true,
      subject: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: assignment.id,
      teacherId: assignment.teacherId,
      classId: assignment.classId,
      className: assignment.class?.name || null,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject?.name || null,
    },
  })
}
