export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

/**
 * GET /api/notifications/web-push/vapid-public-key
 * Public — no auth. Used by browsers / service workers before subscribe.
 */
export const GET = withErrorHandler(async function GET() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim()

  if (!publicKey) {
    return new Response(JSON.stringify({ error: 'VAPID_PUBLIC_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
})
