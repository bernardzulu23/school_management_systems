export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET() {
  return NextResponse.json(
    { error: 'Use GET /api/attendance?classId=&date= for attendance registers.' },
    { status: 400 }
  )
})

export const PUT = withErrorHandler(async function PUT() {
  return NextResponse.json(
    { error: 'Use POST /api/attendance to save attendance.' },
    { status: 400 }
  )
})

export const DELETE = withErrorHandler(async function DELETE() {
  return NextResponse.json(
    { error: 'Attendance rows are updated via POST /api/attendance.' },
    { status: 400 }
  )
})
