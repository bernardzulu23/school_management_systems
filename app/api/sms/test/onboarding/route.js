export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  buildWelcomeSmsMessage,
  getOnboardingSmsFrom,
  normalizePhoneNumbers,
  sendOutboundSms,
} from '@/lib/sms'

/** DEV ONLY — test onboarding welcome SMS. */
export const POST = withErrorHandler(async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const to = normalizePhoneNumbers(body?.to)
  if (!to.length) {
    return NextResponse.json({ error: 'to (Zambian mobile) required' }, { status: 400 })
  }

  const schoolName = String(body?.schoolName || 'Test School').trim() || 'Test School'
  const loginUrl = String(
    body?.loginUrl || 'https://example.bluepeacktechnologies.com/login'
  ).trim()
  const message = buildWelcomeSmsMessage({ schoolName, loginUrl })
  const from = getOnboardingSmsFrom()

  const result = await sendOutboundSms({ to, message, from })

  return NextResponse.json({
    ok: result.ok,
    provider: result.provider,
    from,
    message,
    recipients: result.recipients,
    reason: result.reason || null,
    response: result.response,
  })
})
