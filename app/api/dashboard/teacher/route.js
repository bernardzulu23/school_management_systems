import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { SCHOOL_SUBJECTS } from '@/data/subjects'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const teacher = await prisma.teacher.findFirst({
      where: { userId: auth.user.id, schoolId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            contact_number: true,
            profile_picture_url: true,
          },
        },
        classes: true,
        subjects: true,
        teachingAssignments: {
          where: { schoolId },
          include: {
            class: true,
            subject: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({
        stats: {
          totalClasses: 0,
          totalStudents: 0,
          totalSubjects: 0,
          totalAssessments: 0,
          totalResults: 0,
          totalGoals: 0,
          completedGoals: 0,
          averagePerformance: 0,
          attendanceRate: 0,
        },
        my_classes: [],
        my_subjects: [],
        recent_assessments: [],
        teacher: null,
      })
    }

    const assignments = teacher.teachingAssignments || []

    const classById = new Map()
    assignments.forEach((a) => {
      if (a?.class?.id) classById.set(String(a.class.id), a.class)
    })
    ;(teacher.classes || []).forEach((c) => {
      if (c?.id) classById.set(String(c.id), c)
    })

    const subjectById = new Map()
    assignments.forEach((a) => {
      if (a?.subject?.id) subjectById.set(String(a.subject.id), a.subject)
    })
    ;(teacher.subjects || []).forEach((s) => {
      if (s?.id) subjectById.set(String(s.id), s)
    })

    const assignedSubjectNames = Array.isArray(teacher.assignedSubjects)
      ? teacher.assignedSubjects.map(String).filter(Boolean)
      : []

    if (assignedSubjectNames.length > 0) {
      const existingSubjects = await prisma.subject.findMany({
        where: {
          schoolId,
          OR: [{ name: { in: assignedSubjectNames } }, { id: { in: assignedSubjectNames } }],
        },
        select: { id: true, name: true, code: true, topics: true },
      })
      existingSubjects.forEach((s) => {
        if (s?.id) subjectById.set(String(s.id), s)
      })
    }

    const classIds = Array.from(classById.keys())
    const subjectIds = Array.from(subjectById.keys())
    const myClassRecords = Array.from(classById.values())
    const mySubjectRecords = Array.from(subjectById.values())

    const classNames = myClassRecords.map((c) => String(c.name)).filter(Boolean)
    const subjectNames = mySubjectRecords.map((s) => String(s.name)).filter(Boolean)

    const classStudentCounts = new Map()
    if (assignments.length > 0) {
      const classToSubjectIds = new Map()
      for (const a of assignments) {
        if (!classToSubjectIds.has(a.classId)) classToSubjectIds.set(a.classId, new Set())
        classToSubjectIds.get(a.classId).add(a.subjectId)
      }

      await prisma.$transaction(async (tx) => {
        for (const classId of classIds) {
          const subjectIdSet = classToSubjectIds.get(classId) || new Set()
          const subjectIdList = Array.from(subjectIdSet)
          if (subjectIdList.length === 0) {
            classStudentCounts.set(classId, 0)
            continue
          }

          const pupils = await tx.pupilSubjectEnrollment.findMany({
            where: {
              schoolId,
              classId,
              subjectId: { in: subjectIdList },
            },
            distinct: ['pupilId'],
            select: { pupilId: true },
          })
          classStudentCounts.set(classId, pupils.length)
        }
      })
    } else if (classNames.length > 0) {
      const counts = await prisma.student.groupBy({
        by: ['class'],
        where: { schoolId, class: { in: classNames } },
        _count: { _all: true },
      })
      const classIdByName = new Map(myClassRecords.map((c) => [String(c.name), String(c.id)]))
      counts.forEach((c) => {
        const id = classIdByName.get(String(c.class))
        if (id) classStudentCounts.set(id, c._count._all)
      })
    }

    const studentIdSet = new Set()

    if (assignments.length > 0) {
      const enrolled = await prisma.pupilSubjectEnrollment.findMany({
        where: {
          schoolId,
          OR: assignments.map((a) => ({
            classId: a.classId,
            subjectId: a.subjectId,
          })),
        },
        distinct: ['pupilId'],
        select: { pupilId: true },
      })
      enrolled.forEach((e) => {
        if (e?.pupilId) studentIdSet.add(String(e.pupilId))
      })
    }

    if (classNames.length > 0) {
      const classStudents = await prisma.student.findMany({
        where: { schoolId, class: { in: classNames } },
        select: { id: true },
        take: 2000,
      })
      classStudents.forEach((s) => {
        if (s?.id) studentIdSet.add(String(s.id))
      })
    }

    if (studentIdSet.size === 0 && subjectIds.length > 0) {
      const enrolled = await prisma.pupilSubjectEnrollment.findMany({
        where: { schoolId, subjectId: { in: subjectIds } },
        distinct: ['pupilId'],
        select: { pupilId: true },
        take: 5000,
      })
      enrolled.forEach((e) => {
        if (e?.pupilId) studentIdSet.add(String(e.pupilId))
      })
    }

    if (studentIdSet.size === 0 && subjectNames.length > 0) {
      const selected = await prisma.student.findMany({
        where: { schoolId, selected_subjects: { hasSome: subjectNames } },
        select: { id: true },
        take: 2000,
      })
      selected.forEach((s) => {
        if (s?.id) studentIdSet.add(String(s.id))
      })
    }

    const totalStudents = studentIdSet.size

    const totalAssessments = await prisma.assessment.count({
      where: { schoolId },
    })

    const totalResults = await prisma.result.count({
      where: { schoolId },
    })

    const avgScore = await prisma.result.aggregate({
      where: { schoolId },
      _avg: { score: true },
    })

    const averagePerformance = avgScore?._avg?.score ? Math.round(avgScore._avg.score) : 0

    const recentAssessments = await prisma.assessment.findMany({
      where: { schoolId },
      orderBy: { date: 'desc' },
      take: 10,
    })

    const studentIdsForRecent = Array.from(studentIdSet).slice(0, 5000)
    const recentResults =
      subjectIds.length > 0
        ? await prisma.result.findMany({
            where: {
              schoolId,
              subjectId: { in: subjectIds },
              ...(studentIdsForRecent.length > 0 ? { studentId: { in: studentIdsForRecent } } : {}),
            },
            include: {
              student: { select: { id: true, name: true, exam_number: true, class: true } },
              subject: { select: { id: true, name: true, code: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
          })
        : []

    const myClasses = myClassRecords.filter(Boolean).map((c) => ({
      id: c.id,
      name: c.name,
      year_group: c.year_group,
      section: c.section,
      capacity: 60,
      student_count: classStudentCounts.get(c.id) || 0,
      next_class: null,
    }))

    const subjectMeta = new Map(SCHOOL_SUBJECTS.map((s) => [s.name, s]))

    const mySubjects = mySubjectRecords.filter(Boolean).map((s) => {
      const meta = subjectMeta.get(s.name)
      const classCount =
        assignments.length > 0
          ? new Set(assignments.filter((a) => a.subjectId === s.id).map((a) => a.classId)).size
          : 0
      return {
        id: s.id,
        name: s.name,
        code: s.code || meta?.code || null,
        category: meta?.category || null,
        class_count: classCount,
      }
    })

    const subjectStudentCounts = new Map()
    await prisma.$transaction(async (tx) => {
      for (const s of mySubjects) {
        const relevantPairs =
          assignments.length > 0
            ? assignments
                .filter((a) => a.subjectId === s.id)
                .map((a) => ({ classId: a.classId, subjectId: a.subjectId }))
            : []

        if (relevantPairs.length > 0) {
          const pupils = await tx.pupilSubjectEnrollment.findMany({
            where: { schoolId, OR: relevantPairs },
            distinct: ['pupilId'],
            select: { pupilId: true },
          })
          subjectStudentCounts.set(s.id, pupils.length)
          continue
        }

        const pupils = await tx.pupilSubjectEnrollment.findMany({
          where: { schoolId, subjectId: s.id },
          distinct: ['pupilId'],
          select: { pupilId: true },
          take: 5000,
        })
        if (pupils.length > 0) {
          subjectStudentCounts.set(s.id, pupils.length)
          continue
        }

        const selected = await tx.student.count({
          where: { schoolId, selected_subjects: { has: s.name } },
        })
        subjectStudentCounts.set(s.id, selected)
      }
    })

    const mySubjectsWithCounts = mySubjects.map((s) => ({
      ...s,
      student_count: subjectStudentCounts.get(s.id) || 0,
    }))

    return NextResponse.json({
      stats: {
        totalClasses: myClasses.length,
        totalStudents,
        totalSubjects: mySubjectsWithCounts.length,
        totalAssessments,
        totalResults,
        totalGoals: 0,
        completedGoals: 0,
        averagePerformance,
        attendanceRate: 0,
      },
      my_classes: myClasses,
      my_subjects: mySubjectsWithCounts,
      recent_assessments: recentAssessments.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        subject: a.subject,
        class: a.class,
        status: 'published',
        start_date: a.date,
      })),
      recent_results: recentResults.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.student?.name || null,
        studentExamNumber: r.student?.exam_number || null,
        class: r.student?.class || null,
        subjectId: r.subjectId,
        subjectName: r.subject?.name || null,
        subjectCode: r.subject?.code || null,
        score: r.score,
        grade: r.grade,
        term: r.term,
        year: r.year,
        updatedAt: r.updatedAt,
      })),
      teacher: {
        id: teacher.id,
        department: teacher.department,
        ts_number: teacher.ts_number,
        name: teacher.user?.name || null,
        email: teacher.user?.email || null,
        contact_number: teacher.user?.contact_number || null,
        profile_picture_url: teacher.user?.profile_picture_url || null,
      },
    })
  } catch (error) {
    console.error('Teacher dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch teacher dashboard stats' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
