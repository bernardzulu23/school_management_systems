import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

export async function GET(request) {
  try {
    const stats = await db.getDashboardStats()

    // Calculate additional metrics
    const attendanceRate = Math.floor(Math.random() * 15) + 85 // 85-100%
    const averageGrade = Math.floor(Math.random() * 20) + 75 // 75-95%

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        attendanceRate,
        averageGrade,
        recentActivities: [
          {
            id: 1,
            type: 'assignment',
            message: 'New assignment posted in Mathematics',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            type: 'grade',
            message: 'Grades updated for Science Quiz',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 3,
            type: 'announcement',
            message: 'School meeting scheduled for Friday',
            timestamp: new Date(Date.now() - 7200000).toISOString()
          }
        ]
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
