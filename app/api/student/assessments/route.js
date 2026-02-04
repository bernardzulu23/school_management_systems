import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    // Mock getting current student
    const student = await prisma.student.findFirst({
      include: {
        results: true
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Fetch Upcoming Assessments
    const upcoming = await prisma.assessment.findMany({
      where: {
        class: student.class,
        subject: { in: student.selected_subjects },
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' }
    })

    // Fetch Completed Results
    // We treat 'Result' entries as completed assessments
    const results = await prisma.result.findMany({
      where: {
        studentId: student.id
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform Results to match UI expectation
    const completed = results.map(r => ({
      id: r.id,
      title: `${r.subject} ${r.type || 'Assessment'}`, // e.g. "Mathematics Exam"
      subject: r.subject,
      type: r.type || 'Test',
      date: r.createdAt,
      totalMarks: 100, // Assumption as Result stores score
      myScore: r.score,
      percentage: r.score, // Assuming score is out of 100 or is percentage
      grade: r.grade || getGrade(r.score),
      status: 'completed',
      classAverage: 75, // Mock for now, would require aggregation query
      rank: 5, // Mock
      feedback: 'Good effort.' // Mock
    }))

    // Transform Upcoming to match UI expectation
    const upcomingFormatted = upcoming.map(a => ({
      id: a.id,
      title: a.title,
      subject: a.subject,
      type: a.type,
      date: a.date,
      time: a.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: '60 mins', // Default
      totalMarks: a.totalMarks,
      status: 'scheduled',
      daysLeft: Math.ceil((new Date(a.date) - new Date()) / (1000 * 60 * 60 * 24)),
      topics: [], // Mock
      preparationMaterials: [] // Mock
    }))

    return NextResponse.json({
      success: true,
      data: {
        upcoming: upcomingFormatted,
        completed: completed
      }
    })

  } catch (error) {
    console.error('Fetch student assessments error:', error)
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
  }
}

function getGrade(score) {
  if (!score) return 'N/A'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}
