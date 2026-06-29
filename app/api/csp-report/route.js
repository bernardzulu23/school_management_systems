export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withSecureHandler } from '@/lib/middleware/secureApi'

/** Dev-only CSP violation reporting endpoint (set CSP_REPORT_URI=/api/csp-report). */
export const POST = withSecureHandler(async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true }, { status: 204 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    console.warn('[CSP Violation]', JSON.stringify(body, null, 2))
  } catch {
    /* ignore malformed reports */
  }

  return NextResponse.json({ ok: true })
})
