export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Use GET /api/timetable/view for the active timetable.' },
    { status: 400 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Use PUT /api/timetable/entries for timetable edits.' },
    { status: 400 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Use DELETE /api/timetable/entries for timetable edits.' },
    { status: 400 }
  )
}
