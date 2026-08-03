export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { pushSmsLog } from '@/lib/sms'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { unauthorizedWebhookResponse, verifySharedWebhookSecret } from '@/lib/security/webhookAuth'

function parseUrlEncoded(text) {
  const params = new URLSearchParams(String(text || ''))
  const out = {}
  for (const [k, v] of params.entries()) out[k] = v
  return out
}

function assertSmsWebhook(request) {
  return verifySharedWebhookSecret(request, 'SMS_WEBHOOK_SECRET', {
    aliasHeaders: ['x-sms-webhook-secret'],
  })
}

export const POST = withErrorHandler(async function POST(request) {
  const auth = assertSmsWebhook(request)
  if (!auth.ok) return unauthorizedWebhookResponse(auth)

  const contentType = String(request.headers.get('content-type') || '').toLowerCase()

  let payload = {}
  if (contentType.includes('application/json')) {
    payload = await request.json().catch(() => ({}))
  } else {
    const text = await request.text().catch(() => '')
    payload = parseUrlEncoded(text)
  }

  const schoolId = (await getSchoolIdFromRequest(request)) || null

  pushSmsLog({
    direction: 'in',
    schoolId,
    from: payload?.from || payload?.From || null,
    to: payload?.to || payload?.To || null,
    text: payload?.text || payload?.Text || payload?.message || null,
    linkId: payload?.linkId || payload?.linkID || payload?.linkid || null,
    raw: payload,
  })

  return NextResponse.json({ success: true })
})
