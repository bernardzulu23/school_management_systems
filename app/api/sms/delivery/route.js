import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { pushSmsLog } from '@/lib/sms'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

function parseUrlEncoded(text) {
  const params = new URLSearchParams(String(text || ''))
  const out = {}
  for (const [k, v] of params.entries()) out[k] = v
  return out
}

export const POST = withErrorHandler(async function POST(request) {
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
    direction: 'dlr',
    schoolId,
    status: payload?.status || payload?.Status || null,
    messageId: payload?.id || payload?.messageId || payload?.MessageId || null,
    phoneNumber: payload?.phoneNumber || payload?.to || payload?.To || null,
    raw: payload,
  })

  return NextResponse.json({ success: true })
})
