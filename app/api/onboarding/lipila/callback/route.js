export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import { logger, captureError } from '@/lib/utils/logger'
import { safeStringId } from '@/lib/security/safeQueryValue'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { unauthorizedWebhookResponse, verifySharedWebhookSecret } from '@/lib/security/webhookAuth'

/** Matches UUID / CUID id shape used across ZSMS (see lib/schemas idString). */
const REGISTRATION_ID_SHAPE = /^[A-Za-z0-9_-]+$/

function sanitizeRegistrationId(value) {
  const id = safeStringId(value)
  if (!id || !REGISTRATION_ID_SHAPE.test(id)) return null
  return id
}

function getIdentifier(payload) {
  const p = payload || {}
  const raw =
    p.identifier ||
    p.internalId ||
    p.internal_id ||
    p?.data?.identifier ||
    p?.data?.internalId ||
    p?.data?.internal_id ||
    null
  return sanitizeRegistrationId(raw)
}

function getReferenceId(payload) {
  const p = payload || {}
  const raw =
    p.referenceId || p.reference_id || p?.data?.referenceId || p?.data?.reference_id || null
  return safeStringId(raw, { maxLength: 256 })
}

function getStatus(payload) {
  return String(payload?.status || payload?.data?.status || '').trim()
}

async function markRegistrationPaid({ identifier, referenceId }) {
  if (identifier) {
    await prisma.schoolRegistration.updateMany({
      where: { id: identifier },
      data: { paymentStatus: 'paid', ...(referenceId ? { paymentReference: referenceId } : {}) },
    })
    return
  }
  if (referenceId) {
    await prisma.schoolRegistration.updateMany({
      where: { paymentReference: referenceId },
      data: { paymentStatus: 'paid' },
    })
  }
}

async function markRegistrationFailed({ identifier, referenceId }) {
  const data = { paymentStatus: 'failed' }
  if (identifier) {
    await prisma.schoolRegistration.updateMany({ where: { id: identifier }, data })
    return
  }
  if (referenceId) {
    await prisma.schoolRegistration.updateMany({ where: { paymentReference: referenceId }, data })
  }
}

function assertLipilaWebhook(request) {
  return verifySharedWebhookSecret(request, 'LIPILA_WEBHOOK_SECRET', {
    aliasHeaders: ['x-lipila-webhook-secret'],
  })
}

export const POST = withSecureHandler(async function POST(request) {
  const route = '/api/onboarding/lipila/callback'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  const auth = assertLipilaWebhook(request)
  if (!auth.ok) {
    log.response(auth.status, Date.now() - start)
    return unauthorizedWebhookResponse(auth)
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const identifier = getIdentifier(payload)
    const referenceId = getReferenceId(payload)
    if (!identifier && !referenceId) {
      log.response(200, Date.now() - start)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const status = getStatus(payload)
    const ctx = logger({ route, registrationId: identifier || undefined })
    if (isPaidLipilaStatus(status)) {
      await markRegistrationPaid({ identifier, referenceId })
      ctx.info('Payment marked paid', { referenceId, status })
    } else if (isFailedLipilaStatus(status)) {
      await markRegistrationFailed({ identifier, referenceId })
      ctx.warn('Payment marked failed', { referenceId, status })
    }

    log.response(200, Date.now() - start)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    captureError(error, { route })
    log.response(500, Date.now() - start)
    return NextResponse.json({ success: false }, { status: 500 })
  }
})

/**
 * Browser return URL only — never trust query status to mutate payment state.
 * Activation happens via authenticated POST webhook or client status poll.
 */
export const GET = withSecureHandler(async function GET(request) {
  const route = '/api/onboarding/lipila/callback'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  try {
    const { searchParams } = new URL(request.url)
    const referenceId = safeStringId(searchParams.get('referenceId'), { maxLength: 256 })

    log.response(302, Date.now() - start)
    const origin = new URL(request.url).origin
    const params = new URLSearchParams({ step: 'plan', paymentReturn: '1' })
    if (referenceId) params.set('referenceId', referenceId)
    return NextResponse.redirect(`${origin}/onboarding?${params.toString()}`)
  } catch (error) {
    captureError(error, { route })
    log.response(500, Date.now() - start)
    return NextResponse.json({ success: false }, { status: 500 })
  }
})
