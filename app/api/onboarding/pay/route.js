import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'

const PLAN_PRICING = {
  basic: 150,
  standard: 300,
  premium: 600,
}

const PAYMENT_OPTION_BY_PROVIDER = {
  airtel: { label: 'Airtel Zambia', paymentType: 'AirtelMoney' },
  mtn: { label: 'MTN Zambia', paymentType: 'MTNMoney' },
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
  const rl = rateLimiter(request, {
    limit: process.env.NODE_ENV === 'production' ? 30 : 300,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'onboarding_pay_',
    keyGenerator: ({ ip }) => `${ip}`,
  })
  if (rl.isLimited) return rl.response

  const token = request.cookies.get('onboarding_token')?.value || ''
  const registrationId = verifyOnboardingToken(token)
  if (!registrationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reg = await prisma.schoolRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true, email: true, isVerified: true },
  })
  if (!reg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!reg.isVerified)
    return NextResponse.json({ error: 'Verify your email first' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const plan = String(body?.plan || '')
    .trim()
    .toLowerCase()
  const provider = String(body?.provider || '')
    .trim()
    .toLowerCase()
  const accountNumber = normalizeZambiaMsisdn(body?.accountNumber)

  if (!PLAN_PRICING[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  if (!PAYMENT_OPTION_BY_PROVIDER[provider]) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }
  if (!accountNumber) return NextResponse.json({ error: 'Invalid accountNumber' }, { status: 400 })

  const amount = PLAN_PRICING[plan]
  const referenceId = crypto.randomUUID()

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const proto = forwardedProto || (host && String(host).includes('localhost') ? 'http' : 'https')
  const origin = host
    ? `${proto}://${host}`
    : request.headers.get('origin') || new URL(request.url).origin
  const callbackUrl = `${origin}/api/onboarding/lipila/callback`

  const lipilaPayload = {
    callbackUrl,
    referenceId,
    amount,
    narration: `ZSMS ${plan} plan`,
    accountNumber,
    currency: 'ZMW',
    backUrl: `${origin}/onboarding?step=plan`,
    redirectUrl: `${origin}/onboarding?step=setup`,
    email: reg.email,
    paymentType: PAYMENT_OPTION_BY_PROVIDER[provider].paymentType,
  }

  const apiKey = String(process.env.LIPILA_API_KEY || process.env.LIPILA_SECRET_KEY || '').trim()
  const baseUrl = String(
    process.env.LIPILA_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://blz.lipila.io' : 'https://api.lipila.dev')
  ).trim()
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/collections/mobile-money`

  if (!apiKey) {
    await prisma.schoolRegistration.update({
      where: { id: reg.id },
      data: {
        plan,
        paymentStatus: 'paid',
        paymentProvider: provider,
        paymentReference: referenceId,
      },
    })
    return NextResponse.json(
      {
        success: true,
        provider: 'lipila',
        referenceId,
        placeholder: true,
        data: { status: 'Paid', amount, accountNumber, currency: 'ZMW' },
      },
      { status: 200 }
    )
  }

  await prisma.schoolRegistration.update({
    where: { id: reg.id },
    data: {
      plan,
      paymentStatus: 'pending',
      paymentProvider: provider,
      paymentReference: referenceId,
    },
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lipilaPayload),
    })
    clearTimeout(timeout)
    const contentType = String(response.headers.get('content-type') || '')
    const raw = await response.text().catch(() => '')
    let data = {}
    if (raw && contentType.includes('application/json')) {
      data = JSON.parse(raw)
    } else if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = { raw }
      }
    }
    if (!response.ok) {
      await prisma.schoolRegistration.update({
        where: { id: reg.id },
        data: { paymentStatus: 'unpaid' },
      })
      const rawMessage =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.error === 'string'
            ? data.error
            : typeof data?.raw === 'string'
              ? data.raw
              : ''

      const looksLikeBotGate =
        typeof rawMessage === 'string' &&
        (rawMessage.includes('Performing security verification') ||
          rawMessage.includes('Just a moment') ||
          rawMessage.includes('<html') ||
          rawMessage.includes('<!doctype html'))

      const msg = looksLikeBotGate
        ? 'Payment gateway is blocked by security verification. Disable bot protection for the gateway endpoint or whitelist server-to-server requests.'
        : typeof rawMessage === 'string' && rawMessage.trim()
          ? rawMessage.trim()
          : 'Payment request failed'

      return NextResponse.json(
        { error: msg, upstreamStatus: response.status, upstreamContentType: contentType },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { success: true, provider: 'lipila', referenceId, data },
      { status: 200 }
    )
  } catch (error) {
    await prisma.schoolRegistration.update({
      where: { id: reg.id },
      data: { paymentStatus: 'unpaid' },
    })
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Payment gateway timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 502 })
  }
}
