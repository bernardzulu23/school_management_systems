import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    })

    // Fetch related data
    const [allStudents, allResults, teachers] = await Promise.all([
      // Fetch all students to group manually
      prisma.student.findMany({
        select: { class: true }
      }),
      // Fetch all results to aggregate manually
      prisma.result.findMany({
        include: {
          student: {
            select: { class: true }
          },
          subject: {
            select: { name: true }
          }
        }
      }),
      // Fetch all teachers to map names
      prisma.teacher.findMany({
        include: {
          user: {
            select: { name: true }
          }
        }
      })
    ])

    // Group students by class manually
    const studentsByClass = []
    const classCountMap = {}
    
    allStudents.forEach(s => {
      const className = s.class || 'Unknown'
      classCountMap[className] = (classCountMap[className] || 0) + 1
    })

    Object.keys(classCountMap).forEach(className => {
      studentsByClass.push({
        class: className,
        _count: { _all: classCountMap[className] }
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

    allResults.forEach(result => {
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
    Object.keys(performanceMap).forEach(className => {
      if (classScoreCounts[className] > 0) {
        performanceMap[className] = performanceMap[className] / classScoreCounts[className]
      }
    })

    const teacherMap = teachers.reduce((acc, curr) => {
      acc[curr.id] = curr.user.name
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
      subjects: subjectsMap[cls.name] ? Array.from(subjectsMap[cls.name]).slice(0, 5) : [], 
      averagePerformance: Math.round(performanceMap[cls.name] || 0),
      attendanceRate: 0 // TODO: Implement Attendance model
    }))

    return NextResponse.json({ success: true, data: classesData })
  } catch (error) {
    console.error('Error fetching classes data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
