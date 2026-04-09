import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'

function toTermLabel(termParam) {
  const raw = String(termParam || '').trim()
  if (!raw || raw === 'All Terms') return ''
  const lower = raw.toLowerCase()
  if (lower.startsWith('term')) {
    const digits = lower.replace(/[^0-9]/g, '')
    if (digits) return `Term ${Number(digits)}`
  }
  return raw
}

function gradeFromAverage(score, gradeLevel) {
  if (score === null || score === undefined) return { grade: 'X', status: 'ABSENT' }
  const normalized = String(gradeLevel || '').toLowerCase()
  const isJunior =
    normalized.includes('form 1') ||
    normalized.includes('form 2') ||
    normalized.includes('grade 8') ||
    normalized.includes('grade 9') ||
    normalized === 'form1' ||
    normalized === 'form2' ||
    normalized === 'grade8' ||
    normalized === 'grade9'

  const isSenior =
    normalized.includes('form 3') ||
    normalized.includes('form 4') ||
    normalized.includes('form 5') ||
    normalized.includes('form 6') ||
    normalized.includes('grade 10') ||
    normalized.includes('grade 11') ||
    normalized.includes('grade 12') ||
    normalized === 'form3' ||
    normalized === 'form4' ||
    normalized === 'form5' ||
    normalized === 'form6' ||
    normalized === 'grade10' ||
    normalized === 'grade11' ||
    normalized === 'grade12'

  if (isJunior) {
    if (score >= 75) return { grade: 'ONE', status: 'DISTINCTION' }
    if (score >= 60) return { grade: 'TWO', status: 'MERIT' }
    if (score >= 50) return { grade: 'THREE', status: 'CREDIT' }
    if (score >= 40) return { grade: 'FOUR', status: 'PASS' }
    return { grade: 'F', status: 'FAIL' }
  }

  if (isSenior) {
    if (score >= 75) return { grade: '1', status: 'DISTINCTION' }
    if (score >= 70) return { grade: '2', status: 'DISTINCTION' }
    if (score >= 65) return { grade: '3', status: 'MERIT' }
    if (score >= 60) return { grade: '4', status: 'MERIT' }
    if (score >= 55) return { grade: '5', status: 'CREDIT' }
    if (score >= 50) return { grade: '6', status: 'CREDIT' }
    if (score >= 45) return { grade: '7', status: 'SATISFACTORY' }
    if (score >= 40) return { grade: '8', status: 'SATISFACTORY' }
    return { grade: '9', status: 'UNSATISFACTORILY' }
  }

  if (score >= 50) return { grade: 'P', status: 'PASS' }
  return { grade: 'F', status: 'FAIL' }
}

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
    const yearParam = searchParams.get('year')
    const yearFilter = yearParam ? Number(yearParam) : null
    const termFilter = toTermLabel(searchParams.get('term'))

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

    const scoreAgg = await prisma.result.aggregate({
      where: resultWhere,
      _avg: { score: true },
    })
    const averageScore = scoreAgg._avg.score ? Math.round(scoreAgg._avg.score) : 0

    const studentScoreRows =
      resultsCount > 0
        ? await prisma.result.findMany({
            where: resultWhere,
            select: { studentId: true, score: true },
            take: 200000,
          })
        : []

    const studentAveragesMap = new Map()
    for (const r of studentScoreRows) {
      const sid = String(r.studentId || '')
      if (!sid) continue
      if (!studentAveragesMap.has(sid)) studentAveragesMap.set(sid, { sum: 0, count: 0 })
      const entry = studentAveragesMap.get(sid)
      entry.sum += Number(r.score || 0)
      entry.count += 1
    }

    const studentsWithResults = Array.from(studentAveragesMap.values()).filter((v) => v.count > 0)
    const achievedCount = studentsWithResults.filter((v) => v.sum / v.count >= 40).length
    const studentAchievement =
      studentsWithResults.length > 0
        ? Math.round((achievedCount / studentsWithResults.length) * 100)
        : 0

    const teacherUserIds = await prisma.teacher
      .findMany({ where: { schoolId }, select: { userId: true }, take: 50000 })
      .then((rows) => rows.map((r) => String(r.userId || '')).filter(Boolean))

    const teacherAgg =
      resultsCount > 0
        ? await prisma.result.groupBy({
            by: ['enteredByUserId'],
            where: {
              ...resultWhere,
              enteredByUserId: { not: null },
            },
            _avg: { score: true },
            _count: { _all: true },
            take: 50000,
          })
        : []

    const teacherAvgRows = teacherAgg
      .filter((r) => r.enteredByUserId && teacherUserIds.includes(String(r.enteredByUserId)))
      .map((r) => Number(r._avg?.score || 0))

    const teacherEffectiveness = teacherAvgRows.length
      ? Math.round(teacherAvgRows.reduce((s, v) => s + v, 0) / teacherAvgRows.length)
      : 0

    const teachersWithAnyResults = new Set(
      teacherAgg
        .filter((r) => r.enteredByUserId)
        .map((r) => String(r.enteredByUserId))
        .filter((id) => teacherUserIds.includes(id))
    )
    const complianceRate =
      teacherUserIds.length > 0
        ? Math.round((teachersWithAnyResults.size / teacherUserIds.length) * 100)
        : 0

    let teacherDevelopment = 0
    if (termFilter) {
      const termNumber = Number(String(termFilter).replace(/[^0-9]/g, '') || '0')
      const prevTerm = termNumber > 1 ? `Term ${termNumber - 1}` : ''
      if (prevTerm) {
        const yearForComparison = yearFilter || new Date().getFullYear()
        const [cur, prev] = await Promise.all([
          prisma.result.groupBy({
            by: ['enteredByUserId'],
            where: {
              schoolId,
              term: termFilter,
              year: yearForComparison,
              enteredByUserId: { not: null },
            },
            _avg: { score: true },
            take: 50000,
          }),
          prisma.result.groupBy({
            by: ['enteredByUserId'],
            where: {
              schoolId,
              term: prevTerm,
              year: yearForComparison,
              enteredByUserId: { not: null },
            },
            _avg: { score: true },
            take: 50000,
          }),
        ])

        const prevByUser = new Map(
          prev
            .filter((r) => r.enteredByUserId)
            .map((r) => [String(r.enteredByUserId), Number(r._avg?.score || 0)])
        )

        const candidates = cur
          .filter((r) => r.enteredByUserId)
          .map((r) => ({
            userId: String(r.enteredByUserId),
            avg: Number(r._avg?.score || 0),
          }))
          .filter((r) => teacherUserIds.includes(r.userId) && prevByUser.has(r.userId))

        if (candidates.length > 0) {
          const improved = candidates.filter((c) => c.avg >= (prevByUser.get(c.userId) || 0)).length
          teacherDevelopment = Math.round((improved / candidates.length) * 100)
        }
      }
    }

    // 4. Students Requiring Attention (Score < 40, scoped by schoolId)
    const lowPerformingResults = await prisma.result.findMany({
      where: { ...resultWhere, score: { lt: 40 } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true,
            exam_number: true,
            parent_father_contact: true,
            guardian_contact: true,
          },
        },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const byStudent = new Map()
    for (const r of lowPerformingResults) {
      const sid = String(r.studentId || r.student?.id || '')
      if (!sid) continue
      if (!byStudent.has(sid)) byStudent.set(sid, [])
      byStudent.get(sid).push(r)
    }

    const studentsRequiringAttention = Array.from(byStudent.entries()).map(([sid, rows]) => {
      const s = rows[0]?.student
      const avgEntry = studentAveragesMap.get(String(sid))
      const overallAverage = avgEntry?.count ? avgEntry.sum / avgEntry.count : 0
      const risk_level = overallAverage < 30 ? 'critical' : 'high'
      const gradeLevel = s?.class || ''
      const gradeInfo = gradeFromAverage(overallAverage, gradeLevel)
      const subjects = rows
        .filter((x) => x?.subject?.name)
        .map((x) => ({
          name: x.subject.name,
          score: Math.round(Number(x.score || 0)),
          grade: x.grade || '',
        }))
      const uniqueByName = new Map(subjects.map((subj) => [String(subj.name), subj]))
      const subjectList = Array.from(uniqueByName.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      return {
        id: sid,
        name: s?.name || 'Unknown',
        student_id: s?.exam_number || '',
        class: s?.class || '',
        grade_level: gradeLevel,
        overall_average: Math.round(overallAverage),
        overall_grade: gradeInfo.grade,
        overall_status: gradeInfo.status,
        risk_level,
        failed_assessments: rows.length,
        low_grades: rows.length,
        subjects: subjectList,
        parent_contact: s?.parent_father_contact || s?.guardian_contact || 'N/A',
      }
    })

    // 5. Performance Trends (scoped by schoolId)
    const yearForTrends = yearFilter || new Date().getFullYear()
    const termAgg = await prisma.result.groupBy({
      by: ['term'],
      where: { schoolId, year: yearForTrends },
      _avg: { score: true },
      _count: { _all: true },
      take: 50000,
    })
    const termPassAgg = await prisma.result.groupBy({
      by: ['term'],
      where: { schoolId, year: yearForTrends, score: { gte: 50 } },
      _count: { _all: true },
      take: 50000,
    })

    const passByTerm = new Map(
      termPassAgg.map((r) => [String(r.term || ''), Number(r._count?._all || 0)])
    )
    const performanceTrends = termAgg
      .filter((r) => r.term)
      .map((r) => {
        const term = String(r.term)
        const total = Number(r._count?._all || 0)
        const passed = passByTerm.get(term) || 0
        const avg = r._avg?.score ? Number(r._avg.score) : 0
        return {
          term,
          average: Math.round(avg),
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
          results: total,
        }
      })
      .sort((a, b) => a.term.localeCompare(b.term))

    // 5a. Performance Summary (for Attention System)
    const criticalRiskCount = studentsRequiringAttention.filter(
      (s) => (s.overall_average || 0) < 30
    ).length
    const highRiskCount = studentsRequiringAttention.filter(
      (s) => (s.overall_average || 0) >= 30 && (s.overall_average || 0) < 40
    ).length

    const subjectAgg = await prisma.result.groupBy({
      by: ['subjectId'],
      where: resultWhere,
      _avg: { score: true },
      _count: { _all: true },
      take: 50000,
    })
    const subjectPassAgg = await prisma.result.groupBy({
      by: ['subjectId'],
      where: { ...resultWhere, score: { gte: 50 } },
      _count: { _all: true },
      take: 50000,
    })
    const passBySubjectId = new Map(
      subjectPassAgg.map((r) => [String(r.subjectId), Number(r._count?._all || 0)])
    )
    const subjectIds = subjectAgg.map((r) => r.subjectId).filter(Boolean)
    const subjects = subjectIds.length
      ? await prisma.subject.findMany({
          where: { schoolId, id: { in: subjectIds } },
          select: { id: true, name: true },
          take: 50000,
        })
      : []
    const subjectNameById = new Map(subjects.map((s) => [String(s.id), s.name]))

    const subjectPerformanceRows = subjectAgg
      .filter((r) => r.subjectId)
      .map((r) => {
        const id = String(r.subjectId)
        const total = Number(r._count?._all || 0)
        const passed = passBySubjectId.get(id) || 0
        const avg = r._avg?.score ? Number(r._avg.score) : 0
        return {
          subjectId: id,
          subject: subjectNameById.get(id) || 'Unknown',
          average: Math.round(avg),
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
          results: total,
        }
      })
      .sort((a, b) => a.subject.localeCompare(b.subject))

    const subject_performance = subjectPerformanceRows.reduce((acc, row) => {
      acc[row.subject] = row.average
      return acc
    }, {})

    const resultsWithClass =
      resultsCount > 0
        ? await prisma.result.findMany({
            where: resultWhere,
            select: { score: true, student: { select: { class: true } } },
            take: 200000,
          })
        : []
    const classTotals = new Map()
    for (const r of resultsWithClass) {
      const name = String(r.student?.class || '').trim() || 'Unknown'
      if (!classTotals.has(name)) classTotals.set(name, { sum: 0, count: 0 })
      const e = classTotals.get(name)
      e.sum += Number(r.score || 0)
      e.count += 1
    }
    const year_group_performance = Array.from(classTotals.entries()).reduce(
      (acc, [name, stats]) => {
        acc[name] = stats.count ? stats.sum / stats.count : 0
        return acc
      },
      {}
    )

    const challengingSubjects = subjectPerformanceRows
      .filter((s) => (s.average || 0) < 50)
      .sort((a, b) => (a.average || 0) - (b.average || 0))
      .slice(0, 3)
      .map((s) => s.subject)

    const strugglingClasses = Array.from(classTotals.entries())
      .map(([className, stats]) => ({
        class: className,
        avg: stats.count ? stats.sum / stats.count : 0,
      }))
      .filter((c) => c.avg < 50)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)
      .map((c) => c.class)

    const performanceSummary = {
      students_requiring_attention: studentsRequiringAttention.length,
      critical_risk_students: criticalRiskCount,
      high_risk_students: highRiskCount,
      average_school_performance: averageScore,
      subjects_most_challenging: challengingSubjects,
      classes_needing_support: strugglingClasses,
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

    const recentResults = await prisma.result.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        score: true,
        grade: true,
        term: true,
        year: true,
        enteredByUserId: true,
        student: { select: { name: true, class: true } },
        subject: { select: { name: true } },
      },
      take: 30,
    })

    const enteredByIds = Array.from(
      new Set(recentResults.map((r) => String(r.enteredByUserId || '')).filter(Boolean))
    )
    const enteredByUsers = enteredByIds.length
      ? await prisma.user.findMany({
          where: { schoolId, id: { in: enteredByIds } },
          select: { id: true, name: true, role: true },
          take: 2000,
        })
      : []
    const userNameById = new Map(enteredByUsers.map((u) => [String(u.id), u.name]))

    const recent_activities = recentResults.map((r) => ({
      id: r.id,
      type: 'result',
      created_at: r.createdAt,
      title: `${r.subject?.name || 'Subject'} result entered`,
      description: `${r.student?.name || 'Student'} • ${r.student?.class || ''} • ${Math.round(
        Number(r.score || 0)
      )}%`,
      actor: userNameById.get(String(r.enteredByUserId || '')) || 'Unknown',
      term: r.term,
      year: r.year,
    }))

    const data = {
      totalStudents,
      totalTeachers,
      totalHods,
      totalHeadteachers,
      totalClasses,
      totalSubjects,
      totalAssessments: 0,
      attendanceRate,
      studentAchievement,
      passRate,
      teacherEffectiveness,
      complianceRate,
      teacherDevelopment,
      studentsRequiringAttention,
      performanceTrends,
      performanceSummary,
      juniorResults,
      seniorResultsAnalysis,
      subject_performance,
      subjectPerformanceRows,
      year_group_performance,
      recent_activities,
      students_requiring_attention: studentsRequiringAttention,
      performance_summary: performanceSummary,
      junior_results: juniorResults,
      seniorResultsAnalysis,
      teacher_effectiveness: teacherEffectiveness,
      compliance_rate: complianceRate,
      teacher_development: teacherDevelopment,
      attendance_rate: attendanceRate,
      student_achievement: studentAchievement,
      pass_rate: passRate,
      year_group_performance: year_group_performance,
      subject_performance_rows: subjectPerformanceRows,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Headteacher Dashboard Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
