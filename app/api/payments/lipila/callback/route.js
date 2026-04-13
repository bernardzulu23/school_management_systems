import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request) {
  const payload = await request.json().catch(() => ({}))
  return NextResponse.json({ success: true }, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ success: true }, { status: 200 })
}
