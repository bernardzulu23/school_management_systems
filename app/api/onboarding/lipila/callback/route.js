export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import { logger, captureError } from '@/lib/utils/logger'

function getIdentifier(payload) {
  const p = payload || {}
  return (
    String(
      p.identifier ||
        p.internalId ||
        p.internal_id ||
        p?.data?.identifier ||
        p?.data?.internalId ||
        p?.data?.internal_id ||
        ''
    ).trim() || null
  )
}

function getReferenceId(payload) {
  const p = payload || {}
  return (
    String(
      p.referenceId || p.reference_id || p?.data?.referenceId || p?.data?.reference_id || ''
    ).trim() || null
  )
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

export async function POST(request) {
  const route = '/api/onboarding/lipila/callback'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

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
}

export async function GET(request) {
  const route = '/api/onboarding/lipila/callback'
  const start = Date.now()
  const log = logger({ route })
  log.request(request)

  try {
    const { searchParams } = new URL(request.url)
    const referenceId = String(searchParams.get('referenceId') || '').trim()
    const identifier = String(searchParams.get('identifier') || '').trim()
    const status = String(searchParams.get('status') || '').trim()

    if (referenceId || identifier) {
      if (isPaidLipilaStatus(status)) {
        await markRegistrationPaid({
          identifier: identifier || null,
          referenceId: referenceId || null,
        })
      } else if (isFailedLipilaStatus(status)) {
        await markRegistrationFailed({
          identifier: identifier || null,
          referenceId: referenceId || null,
        })
      }
    }

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
}
