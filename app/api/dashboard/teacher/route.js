import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Mock data for teacher dashboard
    const data = {
      totalClasses: 5,
      totalStudents: 150,
      totalAssessments: 12,
      totalResults: 450,
      upcomingClasses: [
        { id: 1, subject: 'Mathematics', grade: 'Grade 10A', time: '08:00 AM' },
        { id: 2, subject: 'Physics', grade: 'Grade 11B', time: '10:00 AM' }
      ],
      recentActivities: [
        { id: 1, type: 'submission', student: 'John Doe', subject: 'Math', time: '2 hours ago' },
        { id: 2, type: 'grade', student: 'Jane Smith', subject: 'Physics', time: '5 hours ago' }
      ],
      performanceData: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Average Attendance',
            data: [95, 92, 96, 94],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }
        ]
      }
    }

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Teacher dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher dashboard stats' },
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
