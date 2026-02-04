import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    })

    // Fetch related data in parallel for performance
    const [studentsByClass, resultsByClass, teachers, subjectsByClass] = await Promise.all([
      // Group students by class to get enrollment counts
      prisma.student.groupBy({
        by: ['class'],
        _count: {
          _all: true
        }
      }),
      // Group results by class to get average performance
      prisma.result.groupBy({
        by: ['class'],
        _avg: {
          score: true
        }
      }),
      // Fetch all teachers to map names
      prisma.teacher.findMany({
        include: {
          user: {
            select: { name: true }
          }
        }
      }),
      // Group results by class and subject to get subjects list
      prisma.result.groupBy({
        by: ['class', 'subject'],
      })
    ])

    // Create lookup maps
    const enrollmentMap = studentsByClass.reduce((acc, curr) => {
      acc[curr.class] = curr._count._all
      return acc
    }, {})

    const performanceMap = resultsByClass.reduce((acc, curr) => {
      acc[curr.class] = curr._avg.score || 0
      return acc
    }, {})

    const teacherMap = teachers.reduce((acc, curr) => {
      acc[curr.id] = curr.user.name
      return acc
    }, {})

    const subjectsMap = subjectsByClass.reduce((acc, curr) => {
      if (!acc[curr.class]) acc[curr.class] = []
      // Limit to 5 subjects for display to match previous UI feel if too many
      if (acc[curr.class].length < 5) {
        acc[curr.class].push(curr.subject)
      }
      return acc
    }, {})

    // Combine data
    const classesData = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      yearGroup: cls.level || 'General', // Default if level is missing
      classTeacher: teacherMap[cls.classTeacherId] || 'Unassigned',
      currentEnrollment: enrollmentMap[cls.name] || 0,
      maxCapacity: cls.capacity,
      subjects: subjectsMap[cls.name] || [], // Empty if no subjects found in results
      averagePerformance: Math.round(performanceMap[cls.name] || 0),
      attendanceRate: 0 // TODO: Implement Attendance model
    }))

    return NextResponse.json({ success: true, data: classesData })
  } catch (error) {
    console.error('Error fetching classes data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
