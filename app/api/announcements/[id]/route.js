export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET() {
  return NextResponse.json({ error: 'Announcement not found', data: null }, { status: 404 })
})

export const PUT = withErrorHandler(async function PUT() {
  return NextResponse.json({ error: 'Announcements are not enabled yet.' }, { status: 501 })
})

export const DELETE = withErrorHandler(async function DELETE() {
  return NextResponse.json({ error: 'Announcements are not enabled yet.' }, { status: 501 })
})
