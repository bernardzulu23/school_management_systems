import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * Apply Lipila callback to school subscription upgrade or onboarding registration.
 */
export async function activatePlanPayment({ identifier, referenceId, status }) {
  const paid = isPaidLipilaStatus(status)
  const failed = isFailedLipilaStatus(status)
  if (!paid && !failed) return { handled: false }

  if (identifier) {
    const schoolPayment = await prisma.schoolPlanPayment.findUnique({
      where: { id: identifier },
      select: { id: true, schoolId: true, plan: true, months: true, status: true },
    })
    if (schoolPayment) {
      if (paid) {
        const expiresAt = addMonths(new Date(), schoolPayment.months || 1)
        await prisma.$transaction([
          prisma.schoolPlanPayment.update({
            where: { id: schoolPayment.id },
            data: { status: 'paid', ...(referenceId ? { referenceId } : {}) },
          }),
          prisma.school.update({
            where: { id: schoolPayment.schoolId },
            data: {
              plan: schoolPayment.plan,
              planExpiresAt: expiresAt,
              trialEndsAt: null,
            },
          }),
        ])
      } else if (failed) {
        await prisma.schoolPlanPayment.update({
          where: { id: schoolPayment.id },
          data: { status: 'failed' },
        })
      }
      return { handled: true, type: 'school_plan_payment' }
    }
  }

  const ref = String(referenceId || '').trim()
  if (ref) {
    const byRef = await prisma.schoolPlanPayment.findFirst({
      where: { referenceId: ref },
      select: { id: true, schoolId: true, plan: true, months: true },
    })
    if (byRef) {
      return activatePlanPayment({
        identifier: byRef.id,
        referenceId: ref,
        status,
      })
    }
  }

  if (identifier) {
    await prisma.schoolRegistration.updateMany({
      where: { id: identifier },
      data: paid
        ? { paymentStatus: 'paid', ...(referenceId ? { paymentReference: referenceId } : {}) }
        : { paymentStatus: 'failed' },
    })
    return { handled: true, type: 'school_registration' }
  }

  if (ref) {
    await prisma.schoolRegistration.updateMany({
      where: { paymentReference: ref },
      data: { paymentStatus: paid ? 'paid' : 'failed' },
    })
    return { handled: true, type: 'school_registration' }
  }

  return { handled: false }
}
