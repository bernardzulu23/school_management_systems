export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { getClassAttendanceRates } from '@/lib/dashboard/schoolAnalytics'

export async function GET(request) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    })

    // Fetch related data
    const [allStudents, allResults, teachers] = await Promise.all([
      // Fetch all students to group manually
      prisma.student.findMany({
        where: { schoolId },
        select: { class: true },
      }),
      // Fetch all results to aggregate manually
      prisma.result.findMany({
        where: { schoolId },
        include: {
          student: {
            select: { class: true },
          },
          subject: {
            select: { name: true },
          },
        },
      }),
      // Fetch all teachers to map names
      prisma.teacher.findMany({
        where: { schoolId },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ])

    // Group students by class manually
    const studentsByClass = []
    const classCountMap = {}

    allStudents.forEach((s) => {
      const className = s.class || 'Unknown'
      classCountMap[className] = (classCountMap[className] || 0) + 1
    })

    Object.keys(classCountMap).forEach((className) => {
      studentsByClass.push({
        class: className,
        _count: { _all: classCountMap[className] },
      })
    })

    // Create lookup maps
    const enrollmentMap = studentsByClass.reduce((acc, curr) => {
      acc[curr.class] = curr._count._all
      return acc
    }, {})

    // Manually aggregate results by class
    const performanceMap = {}
    const subjectsMap = {}
    const classScoreCounts = {}

    allResults.forEach((result) => {
      const className = result.student?.class
      const subjectName = result.subject?.name

      if (!className) return

      // Performance Aggregation
      if (!performanceMap[className]) {
        performanceMap[className] = 0
        classScoreCounts[className] = 0
      }
      performanceMap[className] += result.score
      classScoreCounts[className] += 1

      // Subjects Aggregation
      if (!subjectsMap[className]) {
        subjectsMap[className] = new Set()
      }
      if (subjectName) {
        subjectsMap[className].add(subjectName)
      }
    })

    // Finalize averages
    Object.keys(performanceMap).forEach((className) => {
      if (classScoreCounts[className] > 0) {
        performanceMap[className] = performanceMap[className] / classScoreCounts[className]
      }
    })

    const teacherMap = teachers.reduce((acc, curr) => {
      acc[curr.id] = curr.user.name
      return acc
    }, {})

    const classNames = classes.map((c) => c.name)
    const attendanceByClass = await getClassAttendanceRates(schoolId, classNames, 30)

    const classesData = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      yearGroup: cls.level || 'General',
      departmentId: cls.departmentId || null,
      departmentName: cls.department?.name || null,
      classTeacher: teacherMap[cls.classTeacherId] || 'Unassigned',
      currentEnrollment: enrollmentMap[cls.name] || 0,
      maxCapacity: cls.capacity,
      subjects: subjectsMap[cls.name] ? Array.from(subjectsMap[cls.name]).slice(0, 5) : [],
      averagePerformance: Math.round(performanceMap[cls.name] || 0),
      attendanceRate: attendanceByClass[cls.name] ?? 0,
    }))

    return NextResponse.json({ success: true, data: classesData })
  } catch (error) {
    console.error('Error fetching classes data:', error)
    return NextResponse.json({ error: 'Failed to fetch classes data' }, { status: 500 })
  }
}
