export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { syncSchoolPlanPaymentFromLipila } from '@/lib/billing/sync-plan-payment'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const paymentSelect = {
  id: true,
  plan: true,
  months: true,
  amount: true,
  provider: true,
  referenceId: true,
  status: true,
  createdAt: true,
}

async function loadSchool(schoolId) {
  return prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      schoolType: true,
      level: true,
    },
  })
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
    const schoolMeta = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true, ownerUserId: true },
    })
    const canIndividualView =
      schoolMeta?.schoolType === 'INDIVIDUAL' &&
      schoolMeta.ownerUserId === auth.user?.id &&
      roleCheck(auth.user, ['TEACHER', 'teacher'])
    if (!canIndividualView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { searchParams } = new URL(request.url)
  const syncPayment = searchParams.get('syncPayment') === '1' || searchParams.get('sync') === '1'
  const referenceId = safeQueryString(searchParams.get('referenceId'))

  let payment = null
  if (referenceId) {
    payment = await prisma.schoolPlanPayment.findFirst({
      where: { schoolId, referenceId },
      select: paymentSelect,
    })
  } else {
    payment = await prisma.schoolPlanPayment.findFirst({
      where: { schoolId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: paymentSelect,
    })
  }

  if (payment && syncPayment && String(payment.status).toLowerCase() === 'pending') {
    const syncedStatus = await syncSchoolPlanPaymentFromLipila(payment)
    payment = await prisma.schoolPlanPayment.findFirst({
      where: { id: payment.id, schoolId },
      select: paymentSelect,
    })
    if (payment) payment = { ...payment, status: syncedStatus || payment.status }
  }

  const school = await loadSchool(schoolId)

  return NextResponse.json({
    payment: payment
      ? {
          id: payment.id,
          plan: payment.plan,
          months: payment.months,
          amount: payment.amount,
          provider: payment.provider,
          referenceId: payment.referenceId,
          status: String(payment.status || 'pending').toLowerCase(),
          createdAt: payment.createdAt,
        }
      : null,
    school,
    planActive: Boolean(
      school?.planExpiresAt && new Date(school.planExpiresAt).getTime() > Date.now()
    ),
  })
})
