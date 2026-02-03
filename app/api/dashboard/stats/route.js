import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    // Parallel fetch of counts
    const [
      totalStudents,
      totalTeachers,
      totalHods,
      totalResults
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'teacher' } }),
      prisma.user.count({ where: { role: 'hod' } }),
      prisma.result.count()
    ])

    // Approximate counts for things not yet fully modeled in Prisma
    // In a full migration, we would query the Class and Subject tables
    const totalClasses = 4 
    const totalSubjects = 5
    const totalAssessments = totalResults // Using results count as proxy

    const stats = {
      totalStudents,
      totalTeachers,
      totalHods,
      totalClasses,
      totalSubjects,
      totalAssessments
    }

    // Calculate additional metrics
    const attendanceRate = 95 // Mock for now
    const averageGrade = 0 // TODO: Calculate from result records

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        attendanceRate,
        averageGrade,
        recentActivities: [] 
      }
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
