import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import {
  LEDGER_ACTIONS,
  amountsMatchExpected,
  appendPaymentLedger,
  isTerminalPaidStatus,
} from '@/lib/payments/paymentLedger'

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * Apply Lipila callback to school subscription upgrade or onboarding registration.
 * Idempotent for already-paid; refuses paid→failed; amount cross-check on plan payments.
 */
export async function activatePlanPayment({
  identifier,
  referenceId,
  status,
  amount: reportedAmount,
  currency: reportedCurrency,
  eventId,
}) {
  const paid = isPaidLipilaStatus(status)
  const failed = isFailedLipilaStatus(status)
  if (!paid && !failed) return { handled: false }

  const lipilaStatus = String(status || '').trim()
  const ref = String(referenceId || '').trim()

  if (identifier) {
    const schoolPayment = await prisma.schoolPlanPayment.findUnique({
      where: { id: identifier },
      select: {
        id: true,
        schoolId: true,
        plan: true,
        months: true,
        status: true,
        amount: true,
        referenceId: true,
      },
    })
    if (schoolPayment) {
      const current = String(schoolPayment.status || '')
        .trim()
        .toLowerCase()

      if (isTerminalPaidStatus(current) && paid) {
        await appendPaymentLedger({
          schoolId: schoolPayment.schoolId,
          paymentKind: 'school_plan',
          paymentId: schoolPayment.id,
          referenceId: ref || schoolPayment.referenceId,
          action: LEDGER_ACTIONS.DUPLICATE,
          amount: schoolPayment.amount,
          currency: 'ZMW',
          lipilaStatus,
          eventKey: `lipila:school_plan:${schoolPayment.id}:DUPLICATE:${eventId || ref || lipilaStatus}`,
        })
        return { handled: true, type: 'school_plan_payment', reason: 'duplicate' }
      }

      if (isTerminalPaidStatus(current) && failed) {
        await appendPaymentLedger({
          schoolId: schoolPayment.schoolId,
          paymentKind: 'school_plan',
          paymentId: schoolPayment.id,
          referenceId: ref || schoolPayment.referenceId,
          action: LEDGER_ACTIONS.REJECTED_STATUS,
          amount: schoolPayment.amount,
          currency: 'ZMW',
          lipilaStatus,
          eventKey: `lipila:school_plan:${schoolPayment.id}:REJECTED_STATUS:${eventId || ref || lipilaStatus}`,
          metadata: { note: 'refuse_paid_to_failed' },
        })
        return { handled: true, type: 'school_plan_payment', reason: 'refuse_regression' }
      }

      if (paid) {
        const match = amountsMatchExpected(
          { amount: schoolPayment.amount, currency: 'ZMW' },
          { amount: reportedAmount, currency: reportedCurrency || 'ZMW' },
          { amountTolerance: 0 }
        )
        if (!match.ok) {
          await appendPaymentLedger({
            schoolId: schoolPayment.schoolId,
            paymentKind: 'school_plan',
            paymentId: schoolPayment.id,
            referenceId: ref || schoolPayment.referenceId,
            action: LEDGER_ACTIONS.REJECTED_AMOUNT,
            amount: reportedAmount,
            currency: reportedCurrency || 'ZMW',
            lipilaStatus,
            eventKey: `lipila:school_plan:${schoolPayment.id}:REJECTED_AMOUNT:${eventId || ref || lipilaStatus}`,
            metadata: match,
          })
          return { handled: false, reason: match.reason || 'amount_mismatch' }
        }

        const ledger = await appendPaymentLedger({
          schoolId: schoolPayment.schoolId,
          paymentKind: 'school_plan',
          paymentId: schoolPayment.id,
          referenceId: ref || schoolPayment.referenceId,
          action: LEDGER_ACTIONS.PAID,
          amount: schoolPayment.amount,
          currency: 'ZMW',
          lipilaStatus,
          eventKey: `lipila:school_plan:${schoolPayment.id}:PAID:${eventId || ref || lipilaStatus}`,
        })
        if (ledger.duplicate) {
          return { handled: true, type: 'school_plan_payment', reason: 'duplicate' }
        }

        const expiresAt = addMonths(new Date(), schoolPayment.months || 1)
        await prisma.$transaction([
          prisma.schoolPlanPayment.updateMany({
            where: { id: schoolPayment.id, schoolId: schoolPayment.schoolId },
            data: { status: 'paid', ...(ref ? { referenceId: ref } : {}) },
          }),
          prisma.school.update({
            where: { id: schoolPayment.schoolId },
            data: {
              plan:
                schoolPayment.plan === 'individual_annual'
                  ? 'individual_premium'
                  : schoolPayment.plan,
              planExpiresAt:
                schoolPayment.plan === 'individual_annual' ? addMonths(new Date(), 12) : expiresAt,
              trialEndsAt: null,
            },
          }),
        ])
      } else if (failed && current !== 'failed') {
        await appendPaymentLedger({
          schoolId: schoolPayment.schoolId,
          paymentKind: 'school_plan',
          paymentId: schoolPayment.id,
          referenceId: ref || schoolPayment.referenceId,
          action: LEDGER_ACTIONS.FAILED,
          amount: schoolPayment.amount,
          currency: 'ZMW',
          lipilaStatus,
          eventKey: `lipila:school_plan:${schoolPayment.id}:FAILED:${eventId || ref || lipilaStatus}`,
        })
        await prisma.schoolPlanPayment.updateMany({
          where: { id: schoolPayment.id, schoolId: schoolPayment.schoolId },
          data: { status: 'failed' },
        })
      }
      return { handled: true, type: 'school_plan_payment' }
    }
  }

  if (ref) {
    const byRef = await prisma.schoolPlanPayment.findFirst({
      where: { referenceId: ref },
      select: { id: true },
    })
    if (byRef) {
      return activatePlanPayment({
        identifier: byRef.id,
        referenceId: ref,
        status,
        amount: reportedAmount,
        currency: reportedCurrency,
        eventId,
      })
    }
  }

  if (identifier) {
    const reg = await prisma.schoolRegistration.findFirst({
      where: { id: identifier },
      select: { id: true, paymentStatus: true, paymentReference: true },
    })
    if (reg) {
      const current = String(reg.paymentStatus || '')
        .trim()
        .toLowerCase()
      if (isTerminalPaidStatus(current) && paid) {
        await appendPaymentLedger({
          paymentKind: 'registration',
          paymentId: reg.id,
          referenceId: ref || reg.paymentReference,
          action: LEDGER_ACTIONS.DUPLICATE,
          lipilaStatus,
          eventKey: `lipila:registration:${reg.id}:DUPLICATE:${eventId || ref || lipilaStatus}`,
        })
        return { handled: true, type: 'school_registration', reason: 'duplicate' }
      }
      if (isTerminalPaidStatus(current) && failed) {
        await appendPaymentLedger({
          paymentKind: 'registration',
          paymentId: reg.id,
          referenceId: ref || reg.paymentReference,
          action: LEDGER_ACTIONS.REJECTED_STATUS,
          lipilaStatus,
          eventKey: `lipila:registration:${reg.id}:REJECTED_STATUS:${eventId || ref || lipilaStatus}`,
        })
        return { handled: true, type: 'school_registration', reason: 'refuse_regression' }
      }
      if (paid) {
        await appendPaymentLedger({
          paymentKind: 'registration',
          paymentId: reg.id,
          referenceId: ref || reg.paymentReference,
          action: LEDGER_ACTIONS.PAID,
          lipilaStatus,
          eventKey: `lipila:registration:${reg.id}:PAID:${eventId || ref || lipilaStatus}`,
        })
        await prisma.schoolRegistration.updateMany({
          where: { id: identifier, paymentStatus: { not: 'paid' } },
          data: { paymentStatus: 'paid', ...(ref ? { paymentReference: ref } : {}) },
        })
      } else if (failed && current !== 'paid') {
        await appendPaymentLedger({
          paymentKind: 'registration',
          paymentId: reg.id,
          referenceId: ref || reg.paymentReference,
          action: LEDGER_ACTIONS.FAILED,
          lipilaStatus,
          eventKey: `lipila:registration:${reg.id}:FAILED:${eventId || ref || lipilaStatus}`,
        })
        await prisma.schoolRegistration.updateMany({
          where: { id: identifier, paymentStatus: { not: 'paid' } },
          data: { paymentStatus: 'failed' },
        })
      }
      return { handled: true, type: 'school_registration' }
    }
  }

  if (ref) {
    const byRef = await prisma.schoolRegistration.findFirst({
      where: { paymentReference: ref },
      select: { id: true, paymentStatus: true },
    })
    if (byRef) {
      return activatePlanPayment({
        identifier: byRef.id,
        referenceId: ref,
        status,
        amount: reportedAmount,
        currency: reportedCurrency,
        eventId,
      })
    }
  }

  return { handled: false }
}
