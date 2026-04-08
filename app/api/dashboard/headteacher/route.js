import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden: Headteacher access only' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const termParam = String(searchParams.get('term') || '').trim()
    const yearParam = searchParams.get('year')
    const yearFilter = yearParam ? Number(yearParam) : null
    const termFilter = (() => {
      const raw = termParam
      if (!raw || raw === 'All Terms') return ''
      const lower = raw.toLowerCase()
      if (lower.startsWith('term')) {
        const digits = lower.replace(/[^0-9]/g, '')
        if (digits) return `Term ${Number(digits)}`
      }
      return raw
    })()

    const resultWhere = {
      schoolId,
      ...(termFilter ? { term: termFilter } : {}),
      ...(yearFilter ? { year: yearFilter } : {}),
    }

    // 1. Basic Stats (scoped by schoolId for multi-tenant isolation)
    const [
      totalStudents,
      totalTeachers,
      totalHods,
      totalHeadteachers,
      totalClasses,
      totalSubjects,
      resultsCount,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.headOfDepartment.count({ where: { schoolId } }),
      prisma.user.count({
        where: { role: { in: ['headteacher', 'HEADTEACHER', 'admin', 'administrator'] }, schoolId },
      }),
      prisma.class.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId } }),
      prisma.result.count({ where: resultWhere }),
    ])

    // 2. Attendance (Proper date-range scoped counting)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    const [todayAttendanceCount, presentCount] = await Promise.all([
      prisma.attendance.count({
        where: { schoolId, date: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.attendance.count({
        where: { schoolId, date: { gte: startOfDay, lte: endOfDay }, status: 'present' },
      }),
    ])

    const attendanceRate =
      todayAttendanceCount > 0 ? Math.round((presentCount / todayAttendanceCount) * 100) : 0

    // 3. Pass Rate Calculation (from Results, scoped by schoolId)
    const passedResults = await prisma.result.count({
      where: { ...resultWhere, score: { gte: 50 } },
    })
    const passRate = resultsCount > 0 ? Math.round((passedResults / resultsCount) * 100) : 0

    // 4. Students Requiring Attention (Score < 40, scoped by schoolId)
    const lowPerformingResults = await prisma.result.findMany({
      where: { ...resultWhere, score: { lt: 40 } },
      include: {
        student: true,
        subject: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const atRiskMap = new Map()
    lowPerformingResults.forEach((r) => {
      if (!atRiskMap.has(r.studentId)) {
        atRiskMap.set(r.studentId, {
          name: r.student.name,
          year: r.student.class,
          failedAssessments: 0,
          lowGrades: 0,
          subjects: new Set(),
          averageScore: r.score, // Simple implementation
          parentContact: r.student.parent_father_contact || r.student.guardian_contact || 'N/A',
        })
      }
      const student = atRiskMap.get(r.studentId)
      student.failedAssessments += 1
      student.lowGrades += 1
      if (r.subject?.name) {
        student.subjects.add(r.subject.name)
      }
    })

    const studentsRequiringAttention = Array.from(atRiskMap.values()).map((s) => ({
      ...s,
      subjects: Array.from(s.subjects),
    }))

    // 5. Performance Trends (scoped by schoolId)
    const allResultsForTrends = await prisma.result.findMany({
      where: { schoolId },
      select: {
        term: true,
        score: true,
      },
    })

    const trendsMap = {}
    const trendsCount = {}

    allResultsForTrends.forEach((r) => {
      const term = r.term || 'Unknown'
      if (!trendsMap[term]) {
        trendsMap[term] = 0
        trendsCount[term] = 0
      }
      trendsMap[term] += r.score
      trendsCount[term] += 1
    })

    const performanceTrends = Object.keys(trendsMap).map((term) => ({
      term,
      _avg: {
        score: trendsMap[term] / trendsCount[term],
      },
    }))

    // 5a. Performance Summary (for Attention System)
    const criticalRiskCount = studentsRequiringAttention.filter((s) => s.averageScore < 30).length
    const highRiskCount = studentsRequiringAttention.filter(
      (s) => s.averageScore >= 30 && s.averageScore < 40
    ).length

    const allResults = await prisma.result.findMany({
      where: resultWhere,
      include: {
        subject: true,
        student: true,
      },
    })

    // Aggregating Challenging Subjects
    const subjectStats = {}
    allResults.forEach((r) => {
      const subjectName = r.subject?.name || 'Unknown'
      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { total: 0, count: 0 }
      }
      subjectStats[subjectName].total += r.score
      subjectStats[subjectName].count += 1
    })

    const challengingSubjects = Object.entries(subjectStats)
      .map(([subject, stats]) => ({
        subject,
        avg: stats.total / stats.count,
      }))
      .filter((s) => s.avg < 50)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)

    // Aggregating Struggling Classes
    const classStats = {}
    allResults.forEach((r) => {
      const className = r.student?.class || 'Unknown'
      if (!classStats[className]) {
        classStats[className] = { total: 0, count: 0 }
      }
      classStats[className].total += r.score
      classStats[className].count += 1
    })

    const strugglingClasses = Object.entries(classStats)
      .map(([className, stats]) => ({
        class: className,
        avg: stats.total / stats.count,
      }))
      .filter((c) => c.avg < 50)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)

    const performanceSummary = {
      students_requiring_attention: studentsRequiringAttention.length,
      critical_risk_students: criticalRiskCount,
      high_risk_students: highRiskCount,
      average_school_performance: passRate,
      subjects_most_challenging: challengingSubjects.map((s) => s.subject),
      classes_needing_support: strugglingClasses.map((c) => c.class),
    }

    // 5b. Junior Results (scoped by schoolId)
    const juniorResults = await prisma.result.findMany({
      where: {
        ...resultWhere,
        student: {
          class: {
            contains: '8',
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 5,
    })

    const seniorClasses = await prisma.class.findMany({
      where: {
        schoolId,
        OR: [
          { name: { contains: '12' } },
          { year_group: { contains: '12' } },
          { name: { contains: 'Grade 12' } },
          { year_group: { contains: 'Grade 12' } },
        ],
      },
      select: { name: true, year_group: true },
      take: 200,
    })

    const seniorClassValues = Array.from(
      new Set(
        seniorClasses
          .flatMap((c) => [c.name, c.year_group])
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    )

    const seniorStudents = await prisma.student.findMany({
      where: {
        schoolId,
        OR: [
          ...(seniorClassValues.length > 0 ? [{ class: { in: seniorClassValues } }] : []),
          { class: { contains: '12' } },
        ],
      },
      select: { id: true },
      take: 20000,
    })

    const seniorStudentIds = seniorStudents.map((s) => String(s.id))

    const seniorResults =
      seniorStudentIds.length > 0
        ? await prisma.result.findMany({
            where: { ...resultWhere, studentId: { in: seniorStudentIds } },
            include: { subject: true },
            take: 50000,
          })
        : []

    const seniorScores = seniorResults.map((r) => Number(r.score || 0))
    const seniorAverage =
      seniorScores.length > 0
        ? Math.round(seniorScores.reduce((s, v) => s + v, 0) / seniorScores.length)
        : 0

    const seniorPassRate =
      seniorScores.length > 0
        ? Math.round((seniorScores.filter((s) => s >= 50).length / seniorScores.length) * 100)
        : 0

    const gradeCounts = {}
    seniorResults.forEach((r) => {
      const g = String(r.grade || 'Unknown')
        .trim()
        .toUpperCase()
      const bucket = g.startsWith('A')
        ? 'A'
        : g.startsWith('B')
          ? 'B'
          : g.startsWith('C')
            ? 'C'
            : g.startsWith('D')
              ? 'D'
              : g.startsWith('E')
                ? 'E'
                : g.startsWith('F')
                  ? 'F'
                  : g || 'Unknown'
      gradeCounts[bucket] = (gradeCounts[bucket] || 0) + 1
    })

    const seniorGradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      count,
      percentage: seniorResults.length ? Math.round((count / seniorResults.length) * 100) : 0,
    }))

    seniorGradeDistribution.sort((a, b) => String(a.grade).localeCompare(String(b.grade)))

    const subjectStatsSenior = {}
    const subjectStudentSets = {}
    seniorResults.forEach((r) => {
      const name = r.subject?.name || 'Unknown'
      if (!subjectStatsSenior[name]) subjectStatsSenior[name] = { total: 0, count: 0, pass: 0 }
      subjectStatsSenior[name].total += Number(r.score || 0)
      subjectStatsSenior[name].count += 1
      if (Number(r.score || 0) >= 50) subjectStatsSenior[name].pass += 1
      if (!subjectStudentSets[name]) subjectStudentSets[name] = new Set()
      subjectStudentSets[name].add(String(r.studentId))
    })

    const seniorSubjectAnalysis = Object.entries(subjectStatsSenior)
      .map(([subject, stats]) => ({
        subject,
        students: subjectStudentSets[subject]?.size || 0,
        average: stats.count ? Math.round(stats.total / stats.count) : 0,
        passRate: stats.count ? Math.round((stats.pass / stats.count) * 100) : 0,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject))

    const seniorResultsAnalysis = {
      totalStudents: seniorStudentIds.length,
      averageScore: seniorAverage,
      passRate: seniorPassRate,
      gradeDistribution: seniorGradeDistribution,
      subjects: seniorSubjectAnalysis,
    }

    const data = {
      totalStudents,
      totalTeachers,
      totalHods,
      totalHeadteachers,
      totalClasses,
      totalSubjects,
      attendanceRate,
      passRate,
      studentsRequiringAttention,
      performanceTrends,
      performanceSummary,
      juniorResults,
      seniorResultsAnalysis,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Headteacher Dashboard Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
