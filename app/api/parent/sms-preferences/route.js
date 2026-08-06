/**
 * GET/PATCH /api/parent/sms-preferences
 * Phase 5 M2 — per-parent SMS opt-out (account retained).
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeParentPortalRoute } from '@/lib/fees/routeAuth'
import { normalizeZmPhoneNumber } from '@/lib/sms/normalizePhone'
import { setSmsContactOptOut } from '@/lib/privacy/smsOptOut'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeParentPortalRoute(request)
  if (!access.ok) return access.response

  const schoolId = access.schoolId
  const userId = access.auth.user?.id
  if (!userId) throw new ApiError('Unauthorized', 401)

  const profile = await prisma.parentProfile.findFirst({
    where: { schoolId, userId },
    select: {
      phone: true,
      smsOptOutAll: true,
      smsOptOutAttendance: true,
      smsOptOutFees: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      phone: profile?.phone || null,
      smsOptOutAll: Boolean(profile?.smsOptOutAll),
      smsOptOutAttendance: Boolean(profile?.smsOptOutAttendance),
      smsOptOutFees: Boolean(profile?.smsOptOutFees),
    },
  })
})

export const PATCH = withErrorHandler(async function PATCH(request) {
  const access = await authorizeParentPortalRoute(request)
  if (!access.ok) return access.response

  const schoolId = access.schoolId
  const userId = access.auth.user?.id
  if (!userId) throw new ApiError('Unauthorized', 401)

  const body = await request.json().catch(() => ({}))
  const flags = {
    smsOptOutAll: body.smsOptOutAll !== undefined ? Boolean(body.smsOptOutAll) : undefined,
    smsOptOutAttendance:
      body.smsOptOutAttendance !== undefined ? Boolean(body.smsOptOutAttendance) : undefined,
    smsOptOutFees: body.smsOptOutFees !== undefined ? Boolean(body.smsOptOutFees) : undefined,
  }

  let profile = await prisma.parentProfile.findFirst({
    where: { schoolId, userId },
  })

  if (!profile) {
    profile = await prisma.parentProfile.create({
      data: {
        userId,
        schoolId,
        phone: access.auth.user?.contact_number || null,
        smsOptOutAll: Boolean(flags.smsOptOutAll),
        smsOptOutAttendance: Boolean(flags.smsOptOutAttendance ?? flags.smsOptOutAll),
        smsOptOutFees: Boolean(flags.smsOptOutFees ?? flags.smsOptOutAll),
      },
    })
  } else {
    const data = {}
    if (flags.smsOptOutAll !== undefined) data.smsOptOutAll = flags.smsOptOutAll
    if (flags.smsOptOutAttendance !== undefined)
      data.smsOptOutAttendance = flags.smsOptOutAttendance
    if (flags.smsOptOutFees !== undefined) data.smsOptOutFees = flags.smsOptOutFees
    profile = await prisma.parentProfile.update({
      where: { id: profile.id },
      data,
    })
  }

  const phone = normalizeZmPhoneNumber(profile.phone || access.auth.user?.contact_number)
  if (phone) {
    await setSmsContactOptOut(schoolId, phone, {
      optOutAll: profile.smsOptOutAll,
      optOutAttendance: profile.smsOptOutAttendance,
      optOutFees: profile.smsOptOutFees,
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      phone: profile.phone || null,
      smsOptOutAll: profile.smsOptOutAll,
      smsOptOutAttendance: profile.smsOptOutAttendance,
      smsOptOutFees: profile.smsOptOutFees,
    },
  })
})
