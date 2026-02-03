import { NextResponse } from 'next/server'

export async function POST(request) {
  // With custom auth/NextAuth, server-side logout might invalidate session/cookie
  // For now, just return success as client handles token removal
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
