export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Use GET /api/attendance?classId=&date= for attendance registers.' },
    { status: 400 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Use POST /api/attendance to save attendance.' },
    { status: 400 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Attendance rows are updated via POST /api/attendance.' },
    { status: 400 }
  )
}
