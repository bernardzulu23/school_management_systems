export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { handleParentUssd } from '@/lib/ussd/parent-portal'
import { withSecureHandler } from '@/lib/middleware/secureApi'

/**
 * POST /api/ussd — Africa's Talking USSD callback.
 * Configure AT dashboard: callback URL → https://your-domain/api/ussd
 *
 * Body fields: sessionId, phoneNumber, text, serviceCode
 */
export const POST = withSecureHandler(async function POST(request) {
  try {
    const body = await request.formData().catch(() => null)
    let phoneNumber = ''
    let text = ''

    if (body) {
      phoneNumber = String(body.get('phoneNumber') || '')
      text = String(body.get('text') || '')
    } else {
      const json = await request.json().catch(() => ({}))
      phoneNumber = String(json.phoneNumber || '')
      text = String(json.text || '')
    }

    const response = await handleParentUssd(phoneNumber, text)
    return new NextResponse(response, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (e) {
    return new NextResponse('END Service unavailable. Try later.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
})

export const GET = withSecureHandler(async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ZSMS Parent USSD',
    usage: "POST with phoneNumber and text (Africa's Talking)",
  })
})
