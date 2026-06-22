export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Announcement not found', data: null }, { status: 404 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Announcements are not enabled yet.' }, { status: 501 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Announcements are not enabled yet.' }, { status: 501 })
}
