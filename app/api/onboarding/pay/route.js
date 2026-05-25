export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { rateLimiter } from '@/lib/middleware/rateLimiter'
import { verifyOnboardingToken } from '@/lib/middleware/onboardingAuth'
import {
  extractGatewayReferenceId,
  getLipilaConfig,
  LIPILA_PROVIDER_PAYMENT_TYPES,
  lipilaCreateMobileMoneyCollection,
} from '@/lib/payments/lipila'

const PLAN_PRICING = {
  basic: 500,
  standard: 800,
  premium: 1200,
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
    select: { id: true, email: true, isVerified: true, plan: true, paymentStatus: true },
  })
  if (!reg) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!reg.isVerified)
    return NextResponse.json({ error: 'Verify your email first' }, { status: 401 })
  if (String(reg.plan || '').toLowerCase() === 'trial') {
    return NextResponse.json({ error: 'Payment is not required for free trial' }, { status: 400 })
  }
  if (String(reg.paymentStatus || '').toLowerCase() === 'paid') {
    return NextResponse.json({ error: 'Payment already completed' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const plan = String(body?.plan || '')
    .trim()
    .toLowerCase()
  const provider = String(body?.provider || '')
    .trim()
    .toLowerCase()
  const accountNumber = normalizeZambiaMsisdn(body?.accountNumber)
  const monthsRaw = Number(body?.months ?? 1)
  const months = Number.isFinite(monthsRaw) ? Math.trunc(monthsRaw) : 1

  if (!PLAN_PRICING[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  if (!LIPILA_PROVIDER_PAYMENT_TYPES[provider]) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }
  if (!accountNumber) return NextResponse.json({ error: 'Invalid accountNumber' }, { status: 400 })
  if (months < 1 || months > 12) {
    return NextResponse.json({ error: 'Invalid months (1-12)' }, { status: 400 })
  }

  const { apiKey } = getLipilaConfig()
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Mobile money payments are not configured. Set LIPILA_API_KEY in server environment.',
      },
      { status: 503 }
    )
  }

  const amount = PLAN_PRICING[plan] * months
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
    identifier: reg.id,
    amount,
    narration: `ZSMS ${plan} plan`,
    accountNumber,
    currency: 'ZMW',
    backUrl: `${origin}/onboarding?step=plan`,
    redirectUrl: `${origin}/onboarding?step=plan&paymentReturn=1`,
    email: reg.email,
    paymentType: LIPILA_PROVIDER_PAYMENT_TYPES[provider],
  }

  await prisma.schoolRegistration.update({
    where: { id: reg.id },
    data: {
      plan,
      subscriptionMonths: months,
      paymentStatus: 'pending',
      paymentProvider: provider,
      paymentReference: referenceId,
    },
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const result = await lipilaCreateMobileMoneyCollection(lipilaPayload, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!result.ok) {
      await prisma.schoolRegistration.update({
        where: { id: reg.id },
        data: { paymentStatus: 'unpaid' },
      })
      const rawMessage = String(result.error || '')
      const looksLikeBotGate =
        rawMessage.includes('Performing security verification') ||
        rawMessage.includes('Just a moment') ||
        rawMessage.includes('<html') ||
        rawMessage.includes('<!doctype html')
      const msg = looksLikeBotGate
        ? 'Payment gateway is blocked by security verification. Disable bot protection for the gateway endpoint or whitelist server-to-server requests.'
        : rawMessage.trim() || 'Payment request failed'
      return NextResponse.json(
        { error: msg, upstreamStatus: result.status || 502 },
        { status: result.status === 0 ? 502 : 502 }
      )
    }

    const data = result.data || {}
    const gatewayReferenceId = extractGatewayReferenceId(data)
    if (gatewayReferenceId && gatewayReferenceId !== referenceId) {
      await prisma.schoolRegistration.update({
        where: { id: reg.id },
        data: { paymentReference: gatewayReferenceId },
      })
    }

    const lipilaStatus = String(data?.status || '').trim()
    return NextResponse.json(
      {
        success: true,
        provider: 'lipila',
        referenceId: gatewayReferenceId || referenceId,
        lipilaStatus,
        message:
          lipilaStatus.toLowerCase() === 'pending'
            ? 'Check your phone and enter your mobile money PIN to approve the payment.'
            : data?.message || 'Payment request sent',
        data,
      },
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
