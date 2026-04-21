import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

function isPaid(payload) {
  const status = String(payload?.status || payload?.data?.status || '')
    .trim()
    .toLowerCase()
  return (
    status === 'paid' || status === 'success' || status === 'successful' || status === 'completed'
  )
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}))
  const identifier = getIdentifier(payload)
  const referenceId = getReferenceId(payload)
  if (!identifier && !referenceId) return NextResponse.json({ success: true }, { status: 200 })

  if (isPaid(payload)) {
    if (identifier) {
      await prisma.schoolRegistration.updateMany({
        where: { id: identifier },
        data: { paymentStatus: 'paid', paymentReference: referenceId || undefined },
      })
    } else if (referenceId) {
      await prisma.schoolRegistration.updateMany({
        where: { paymentReference: referenceId },
        data: { paymentStatus: 'paid' },
      })
    }
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const referenceId = String(searchParams.get('referenceId') || '').trim()
  const identifier = String(searchParams.get('identifier') || '').trim()
  const status = String(searchParams.get('status') || '')
    .trim()
    .toLowerCase()
  if (referenceId && (status === 'paid' || status === 'success' || status === 'successful')) {
    if (identifier) {
      await prisma.schoolRegistration.updateMany({
        where: { id: identifier },
        data: { paymentStatus: 'paid', paymentReference: referenceId },
      })
    } else {
      await prisma.schoolRegistration.updateMany({
        where: { paymentReference: referenceId },
        data: { paymentStatus: 'paid' },
      })
    }
  }
  return NextResponse.json({ success: true }, { status: 200 })
}
