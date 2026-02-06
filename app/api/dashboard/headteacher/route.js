import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // 1. Basic Stats
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      resultsCount
    ] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.result.count()
    ])

    // 2. Attendance (Placeholder until model exists)
    const attendanceRate = 0 // TODO: Implement Attendance model and logic

    // 3. Pass Rate Calculation (from Results)
    const passedResults = await prisma.result.count({
      where: { score: { gte: 50 } }
    })
    const passRate = resultsCount > 0 ? Math.round((passedResults / resultsCount) * 100) : 0

    // 4. Students Requiring Attention (Score < 40)
    const lowPerformingResults = await prisma.result.findMany({
      where: { score: { lt: 40 } },
      include: { 
        student: true,
        subject: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const atRiskMap = new Map()
    lowPerformingResults.forEach(r => {
      if (!atRiskMap.has(r.studentId)) {
        atRiskMap.set(r.studentId, {
          name: r.student.name,
          year: r.student.class,
          failedAssessments: 0,
          lowGrades: 0,
          subjects: new Set(),
          averageScore: r.score, // Simple implementation
          parentContact: r.student.parent_father_contact || r.student.guardian_contact || 'N/A'
        })
      }
      const student = atRiskMap.get(r.studentId)
      student.failedAssessments += 1
      student.lowGrades += 1
      if (r.subject?.name) {
        student.subjects.add(r.subject.name)
      }
    })
    
    const studentsRequiringAttention = Array.from(atRiskMap.values()).map(s => ({
      ...s,
      subjects: Array.from(s.subjects)
    }))

    // 5. Performance Trends
    // Use manual aggregation instead of groupBy to avoid enum/string validation issues
    const allResultsForTrends = await prisma.result.findMany({
      select: {
        term: true,
        score: true
      }
    })

    const trendsMap = {}
    const trendsCount = {}

    allResultsForTrends.forEach(r => {
      const term = r.term || 'Unknown'
      if (!trendsMap[term]) {
        trendsMap[term] = 0
        trendsCount[term] = 0
      }
      trendsMap[term] += r.score
      trendsCount[term] += 1
    })

    const performanceTrends = Object.keys(trendsMap).map(term => ({
      term,
      _avg: {
        score: trendsMap[term] / trendsCount[term]
      }
    }))

    // 5a. Performance Summary (for Attention System)
    const criticalRiskCount = studentsRequiringAttention.filter(s => s.averageScore < 30).length
    const highRiskCount = studentsRequiringAttention.filter(s => s.averageScore >= 30 && s.averageScore < 40).length

    // Helper for manual aggregation since Result doesn't have direct relations for groupBy
    const allResults = await prisma.result.findMany({
      include: {
        subject: true,
        student: true
      }
    })

    // Aggregating Challenging Subjects
    const subjectStats = {}
    allResults.forEach(r => {
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
        avg: stats.total / stats.count
      }))
      .filter(s => s.avg < 50)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)

    // Aggregating Struggling Classes
    const classStats = {}
    allResults.forEach(r => {
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
        avg: stats.total / stats.count
      }))
      .filter(c => c.avg < 50)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)

    const performanceSummary = {
        students_requiring_attention: studentsRequiringAttention.length,
        critical_risk_students: criticalRiskCount,
        high_risk_students: highRiskCount,
        average_school_performance: passRate,
        subjects_most_challenging: challengingSubjects.map(s => s.subject),
        classes_needing_support: strugglingClasses.map(c => c.class)
    }

    // 5b. Junior Results
    const juniorResults = await prisma.result.findMany({
      where: {
        student: {
          class: {
            contains: '8' // Assuming Grade 8 is Junior
          }
        }
      },
      orderBy: { score: 'desc' },
      take: 5
    })

    const data = {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendanceRate,
      passRate,
      studentsRequiringAttention,
      performanceTrends,
      performanceSummary,
      juniorResults
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Headteacher Dashboard Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
