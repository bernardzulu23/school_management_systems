export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { handleParentUssd } from '@/lib/ussd/parent-portal'
import { withSecureHandler } from '@/lib/middleware/secureApi'

/**
 * POST /api/ussd — Africa's Talking USSD callback.
 * Configure AT dashboard: callback URL → https://your-domain/api/ussd
 *
 * Auth: require header `x-ussd-secret` (or Authorization: Bearer …) matching
 * USSD_CALLBACK_SECRET. Set the secret in env before enabling public callbacks.
 *
 * Body fields: sessionId, phoneNumber, text, serviceCode
 */
function assertUssdSecret(request) {
  const expected = String(process.env.USSD_CALLBACK_SECRET || '').trim()
  if (!expected) {
    // Fail closed in production; allow local/dev without secret when NODE_ENV !== production
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'USSD_CALLBACK_SECRET is not configured' }
    }
    return { ok: true }
  }

  const header = request.headers.get('x-ussd-secret') || request.headers.get('x-api-key') || ''
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  const provided = String(header || bearer || '').trim()

  if (!provided || provided !== expected) {
    return { ok: false, reason: 'Unauthorized' }
  }
  return { ok: true }
}

export const POST = withSecureHandler(async function POST(request) {
  const authz = assertUssdSecret(request)
  if (!authz.ok) {
    return new NextResponse('END Unauthorized', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  try {
    const body = await request.formData().catch(() => null)
    let phoneNumber = ''
    let text = ''
    let serviceCode = ''

    if (body) {
      phoneNumber = String(body.get('phoneNumber') || '')
      text = String(body.get('text') || '')
      serviceCode = String(body.get('serviceCode') || '')
    } else {
      const json = await request.json().catch(() => ({}))
      phoneNumber = String(json.phoneNumber || '')
      text = String(json.text || '')
      serviceCode = String(json.serviceCode || '')
    }

    const response = await handleParentUssd(phoneNumber, text, { serviceCode })
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
    usage: "POST with phoneNumber and text (Africa's Talking); requires x-ussd-secret",
  })
})
