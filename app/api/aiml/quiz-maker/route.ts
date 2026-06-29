import { NextRequest, NextResponse } from 'next/server'
import { withSecureHandler } from '@/lib/middleware/secureApi'

const DEPRECATED = 'Use /api/ai/quiz-maker instead'

function redirect(req: NextRequest) {
  const url = new URL('/api/ai/quiz-maker', req.url)
  return NextResponse.redirect(url, {
    status: 307,
    headers: {
      Sunset: '2026-12-31',
      'X-Deprecated': DEPRECATED,
    },
  })
}

export const GET = withSecureHandler(async function GET(req: NextRequest) {
  return redirect(req)
})

export const POST = withSecureHandler(async function POST(req: NextRequest) {
  return redirect(req)
})
