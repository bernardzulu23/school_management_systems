import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import crypto from 'crypto'

export const runtime = 'nodejs'

const PAYMENT_OPTION_BY_PROVIDER = {
  airtel: { label: 'Airtel Zambia', paymentType: 'AirtelMoney' },
  airtel_zambia: { label: 'Airtel Zambia', paymentType: 'AirtelMoney' },
  mtn: { label: 'MTN_Zambia', paymentType: 'MTNMoney' },
  mtn_zambia: { label: 'MTN_Zambia', paymentType: 'MTNMoney' },
  zamtel: { label: 'Zamtel', paymentType: 'ZamtelMoney' },
}

function normalizeZambiaMsisdn(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('260') && digits.length >= 11) return digits
  if (digits.length === 9) return `260${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return `260${digits.slice(1)}`
  return digits
}

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 30 : 300,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'pay_mm_',
    keyGenerator: ({ ip }) => `${ip}-${String(auth.user?.id || '')}-${schoolId}`,
  })
  if (rl.isLimited) return rl.response

  const body = await request.json().catch(() => ({}))

  const amount = Number(body?.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const accountNumber = normalizeZambiaMsisdn(body?.accountNumber)
  if (!accountNumber) {
    return NextResponse.json({ error: 'Invalid accountNumber' }, { status: 400 })
  }

  const narration = String(body?.narration || 'ZSMS payment').trim()
  const currency = String(body?.currency || 'ZMW')
    .trim()
    .toUpperCase()
  const email = String(body?.email || auth.user?.email || '').trim()

  const providerRaw = String(body?.provider || body?.paymentOption || '')
    .trim()
    .toLowerCase()
  const providerKey = providerRaw.replace(/\s+/g, '_')
  const selectedOption = providerKey ? PAYMENT_OPTION_BY_PROVIDER[providerKey] : null

  const referenceId = String(body?.referenceId || crypto.randomUUID()).trim()

  const origin = request.headers.get('origin') || new URL(request.url).origin
  const callbackUrl = String(body?.callbackUrl || `${origin}/api/payments/lipila/callback`).trim()
  const backUrl = String(body?.backUrl || `${origin}/dashboard`).trim()
  const redirectUrl = String(body?.redirectUrl || `${origin}/dashboard`).trim()

  const lipilaPayload = {
    callbackUrl,
    referenceId,
    amount,
    narration,
    accountNumber,
    currency,
    backUrl,
    redirectUrl,
    email,
    ...(selectedOption ? { paymentType: selectedOption.paymentType } : {}),
  }

  const apiKey = String(process.env.LIPILA_API_KEY || '').trim()
  const baseUrl = String(process.env.LIPILA_BASE_URL || 'https://api.lipila.dev').trim()
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/collections/mobile-money`

  if (!apiKey) {
    return NextResponse.json(
      {
        success: true,
        provider: 'lipila',
        referenceId,
        data: {
          currency,
          amount,
          accountNumber,
          status: 'Pending',
          paymentType: selectedOption?.paymentType || 'AirtelMoney',
          ipAddress:
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          cardRedirectionUrl: null,
          createdAt: new Date().toISOString(),
        },
        placeholder: true,
      },
      { status: 200 }
    )
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lipilaPayload),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = typeof data?.message === 'string' ? data.message : 'Payment request failed'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json(
      { success: true, provider: 'lipila', referenceId, data },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 502 })
  }
}
