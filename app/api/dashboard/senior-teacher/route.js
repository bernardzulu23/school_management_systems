export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  authorizeSeniorTeacherAccess,
  resolvePrimaryClassScope,
  resolvePrimaryTeacherUserIds,
} from '@/lib/senior-teacher/seniorTeacherAccess'

export const GET = withErrorHandler(async function GET(request) {
  const authz = await authorizeSeniorTeacherAccess(request)
  if (!authz.ok) return authz.response

  const { schoolId, isAdmin } = authz
  const reviewerUserId = String(authz.auth.user.id)
  const { classes, classIds } = await resolvePrimaryClassScope(prisma, schoolId)
  const teacherUserIds = await resolvePrimaryTeacherUserIds(prisma, schoolId)

  const [teachers, subjects, lessonPlans, assessments, allocations, primaryStudents] =
    await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId, userId: { in: teacherUserIds } },
        select: {
          id: true,
          userId: true,
          department: true,
          specialization: true,
          user: { select: { id: true, name: true, email: true, role: true } },
          teachingAssignments: {
            where: { schoolId, classId: { in: classIds } },
            select: {
              classId: true,
              class: { select: { id: true, name: true, year_group: true } },
              subject: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.subject.findMany({
        where: { schoolId, educationLevel: 'primary' },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.lessonPlan.findMany({
        where: {
          schoolId,
          grade: {
            in: Array.from(
              new Set(classes.map((row) => String(row.year_group || '').trim()).filter(Boolean))
            ),
          },
        },
        select: {
          id: true,
          status: true,
          reviewerUserId: true,
          createdByUserId: true,
          grade: true,
          subject: true,
          topic: true,
          submittedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.assessment.findMany({
        where: {
          schoolId,
          classId: { in: classIds },
          type: { in: ['quiz', 'assignment'] },
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          classId: true,
          class: true,
          subject: true,
          reviewerUserId: true,
          createdByUserId: true,
          submittedAt: true,
        },
        orderBy: { submittedAt: 'desc' },
        take: 500,
      }),
      prisma.teacherAllocation.findMany({
        where: { schoolId, classId: { in: classIds } },
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true, year_group: true } },
        },
        orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
        take: 500,
      }),
      prisma.student.findMany({
        where: { schoolId, classId: { in: classIds } },
        select: { id: true, classId: true, class: true },
        take: 5000,
      }),
    ])

  const studentsByClassId = new Map()
  for (const row of primaryStudents) {
    const key = String(row.classId || '').trim()
    if (!key) continue
    studentsByClassId.set(key, (studentsByClassId.get(key) || 0) + 1)
  }

  const teacherSummary = teachers.map((teacher) => {
    const assignmentCount = teacher.teachingAssignments.length
    const classNames = Array.from(
      new Set(teacher.teachingAssignments.map((row) => row?.class?.name).filter(Boolean))
    )
    const subjectNames = Array.from(
      new Set(teacher.teachingAssignments.map((row) => row?.subject?.name).filter(Boolean))
    )
    const studentCount = teacher.teachingAssignments.reduce(
      (sum, row) => sum + Number(studentsByClassId.get(String(row.classId || '')) || 0),
      0
    )
    const pendingPlans = lessonPlans.filter(
      (row) =>
        String(row.createdByUserId || '') === String(teacher.userId || '') &&
        String(row.status || '').toUpperCase() === 'SUBMITTED'
    ).length
    const pendingAssessments = assessments.filter(
      (row) =>
        String(row.createdByUserId || '') === String(teacher.userId || '') &&
        String(row.status || '').toUpperCase() === 'SUBMITTED'
    ).length

    return {
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.user?.name || 'Teacher',
      email: teacher.user?.email || '',
      classes: classNames,
      subjects: subjectNames,
      allocationCount: assignmentCount,
      totalStudents: studentCount,
      pendingLessonPlans: pendingPlans,
      pendingAssessments,
    }
  })

  const pendingLessonPlans = lessonPlans.filter(
    (row) =>
      String(row.status || '').toUpperCase() === 'SUBMITTED' &&
      (isAdmin || String(row.reviewerUserId || '') === reviewerUserId)
  )
  const pendingAssessments = assessments.filter(
    (row) =>
      String(row.status || '').toUpperCase() === 'SUBMITTED' &&
      (isAdmin || String(row.reviewerUserId || '') === reviewerUserId)
  )

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        totalStudents: primaryStudents.length,
        totalSubjects: subjects.length,
        totalAllocations: allocations.length,
        pendingLessonPlans: pendingLessonPlans.length,
        pendingAssessments: pendingAssessments.length,
      },
      classes: classes.map((row) => ({
        ...row,
        studentCount: Number(studentsByClassId.get(String(row.id || '')) || 0),
      })),
      teachers: teacherSummary,
      subjects,
      allocations,
      pendingLessonPlans,
      pendingAssessments,
    },
  })
})
