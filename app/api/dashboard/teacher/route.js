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
    const classIds = Array.from(new Set(assignments.map((a) => a.classId)))
    const subjectIds = Array.from(new Set(assignments.map((a) => a.subjectId)))
    const classNames = Array.from(new Set(assignments.map((a) => a.class?.name).filter(Boolean)))
    const subjectNames = Array.from(
      new Set(assignments.map((a) => a.subject?.name).filter(Boolean))
    )

    const classToSubjectIds = new Map()
    for (const a of assignments) {
      if (!classToSubjectIds.has(a.classId)) classToSubjectIds.set(a.classId, new Set())
      classToSubjectIds.get(a.classId).add(a.subjectId)
    }

    const classStudentCounts = new Map()
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

    const totalStudents =
      assignments.length > 0
        ? (
            await prisma.pupilSubjectEnrollment.findMany({
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
          ).length
        : 0

    const totalAssessments =
      subjectNames.length > 0 && classNames.length > 0
        ? await prisma.assessment.count({
            where: {
              schoolId,
              subject: { in: subjectNames },
              class: { in: classNames },
            },
          })
        : 0

    const totalResults =
      subjectIds.length > 0
        ? await prisma.result.count({
            where: {
              schoolId,
              subjectId: { in: subjectIds },
            },
          })
        : 0

    const avgScore =
      subjectIds.length > 0
        ? await prisma.result.aggregate({
            where: { schoolId, subjectId: { in: subjectIds } },
            _avg: { score: true },
          })
        : null

    const averagePerformance = avgScore?._avg?.score ? Math.round(avgScore._avg.score) : 0

    const recentAssessments =
      subjectNames.length > 0 && classNames.length > 0
        ? await prisma.assessment.findMany({
            where: {
              schoolId,
              subject: { in: subjectNames },
              class: { in: classNames },
            },
            orderBy: { date: 'desc' },
            take: 10,
          })
        : []

    const myClasses = Array.from(new Map(assignments.map((a) => [a.classId, a.class])).values())
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        name: c.name,
        year_group: c.year_group,
        section: c.section,
        capacity: 60,
        student_count: classStudentCounts.get(c.id) || 0,
        next_class: null,
      }))

    const subjectMeta = new Map(SCHOOL_SUBJECTS.map((s) => [s.name, s]))

    const mySubjects = Array.from(
      new Map(assignments.map((a) => [a.subjectId, a.subject])).values()
    )
      .filter(Boolean)
      .map((s) => {
        const meta = subjectMeta.get(s.name)
        const classCount = new Set(
          assignments.filter((a) => a.subjectId === s.id).map((a) => a.classId)
        ).size
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
        const relevantPairs = assignments
          .filter((a) => a.subjectId === s.id)
          .map((a) => ({ classId: a.classId, subjectId: a.subjectId }))

        if (relevantPairs.length === 0) {
          subjectStudentCounts.set(s.id, 0)
          continue
        }

        const pupils = await tx.pupilSubjectEnrollment.findMany({
          where: { schoolId, OR: relevantPairs },
          distinct: ['pupilId'],
          select: { pupilId: true },
        })
        subjectStudentCounts.set(s.id, pupils.length)
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
      teacher: {
        id: teacher.id,
        department: teacher.department,
        ts_number: teacher.ts_number,
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
