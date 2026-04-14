import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
  const referenceId = getReferenceId(payload)
  if (!referenceId) return NextResponse.json({ success: true }, { status: 200 })

  if (isPaid(payload)) {
    await prisma.schoolRegistration.updateMany({
      where: { paymentReference: referenceId },
      data: { paymentStatus: 'paid' },
    })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const referenceId = String(searchParams.get('referenceId') || '').trim()
  const status = String(searchParams.get('status') || '')
    .trim()
    .toLowerCase()
  if (referenceId && (status === 'paid' || status === 'success' || status === 'successful')) {
    await prisma.schoolRegistration.updateMany({
      where: { paymentReference: referenceId },
      data: { paymentStatus: 'paid' },
    })
  }
  return NextResponse.json({ success: true }, { status: 200 })
}
