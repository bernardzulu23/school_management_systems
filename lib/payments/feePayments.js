import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'
import {
  LEDGER_ACTIONS,
  amountsMatchExpected,
  appendPaymentLedger,
  isTerminalPaidStatus,
} from '@/lib/payments/paymentLedger'

/** Map stored or Lipila status to UI status keys. */
export function normalizeFeePaymentStatus(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase()
  if (isPaidLipilaStatus(s) || s === 'completed') return 'completed'
  if (isFailedLipilaStatus(s) || s === 'failed') return 'failed'
  return 'pending'
}

/** @param {import('@prisma/client').SchoolFeePayment} record */
export function serializeFeePayment(record) {
  return {
    id: record.id,
    amount: Number(record.amount),
    currency: record.currency,
    provider: record.provider,
    referenceId: record.referenceId,
    status: normalizeFeePaymentStatus(record.status),
    type: record.paymentType || record.narration || 'Payment',
    phone: record.accountNumber,
    accountNumber: record.accountNumber,
    narration: record.narration,
    studentId: record.studentId,
    invoiceId: record.invoiceId ?? null,
    createdAt: record.createdAt?.toISOString?.() || record.createdAt,
  }
}

function feeStatusFromLipila(status) {
  if (isPaidLipilaStatus(status)) return 'completed'
  if (isFailedLipilaStatus(status)) return 'failed'
  return 'pending'
}

/**
 * Apply Lipila callback to a school fee payment record.
 * Always binds updates to the payment's schoolId (and optional expectedSchoolId).
 * Cross-checks amount/currency; refuses paid→failed; append-only ledger.
 *
 * @param {{
 *   identifier?: string | null
 *   referenceId?: string | null
 *   status: string
 *   schoolId?: string | null
 *   amount?: number | null
 *   currency?: string | null
 *   eventId?: string | null
 * }} args
 * @returns {Promise<{ handled: boolean, type?: string, reason?: string }>}
 */
export async function activateFeePayment({
  identifier,
  referenceId,
  status,
  schoolId: expectedSchoolId,
  amount: reportedAmount,
  currency: reportedCurrency,
  eventId,
}) {
  const paid = isPaidLipilaStatus(status)
  const failed = isFailedLipilaStatus(status)
  if (!paid && !failed) return { handled: false }

  const lipilaStatus = String(status || '').trim()
  const nextStatus = feeStatusFromLipila(lipilaStatus)
  const tenantFilter = expectedSchoolId ? { schoolId: String(expectedSchoolId).trim() } : {}
  const ref = String(referenceId || '').trim()

  /** @param {{ id: string, status: string, schoolId: string, referenceId?: string|null, amount: number, currency: string }} payment */
  async function applyToPayment(payment) {
    if (ref && payment.referenceId && payment.referenceId !== ref) {
      return { handled: false, reason: 'reference_mismatch' }
    }

    if (isTerminalPaidStatus(payment.status) && paid) {
      await appendPaymentLedger({
        schoolId: payment.schoolId,
        paymentKind: 'school_fee',
        paymentId: payment.id,
        referenceId: ref || payment.referenceId,
        action: LEDGER_ACTIONS.DUPLICATE,
        amount: payment.amount,
        currency: payment.currency,
        lipilaStatus,
        eventKey: `lipila:school_fee:${payment.id}:DUPLICATE:${eventId || ref || lipilaStatus}`,
        metadata: { note: 'already_completed' },
      })
      return { handled: true, type: 'school_fee_payment', reason: 'duplicate' }
    }

    if (isTerminalPaidStatus(payment.status) && failed) {
      await appendPaymentLedger({
        schoolId: payment.schoolId,
        paymentKind: 'school_fee',
        paymentId: payment.id,
        referenceId: ref || payment.referenceId,
        action: LEDGER_ACTIONS.REJECTED_STATUS,
        amount: payment.amount,
        currency: payment.currency,
        lipilaStatus,
        eventKey: `lipila:school_fee:${payment.id}:REJECTED_STATUS:${eventId || ref || lipilaStatus}`,
        metadata: { note: 'refuse_paid_to_failed' },
      })
      return { handled: true, type: 'school_fee_payment', reason: 'refuse_regression' }
    }

    if (paid) {
      const match = amountsMatchExpected(
        { amount: payment.amount, currency: payment.currency },
        { amount: reportedAmount, currency: reportedCurrency }
      )
      if (!match.ok) {
        await appendPaymentLedger({
          schoolId: payment.schoolId,
          paymentKind: 'school_fee',
          paymentId: payment.id,
          referenceId: ref || payment.referenceId,
          action: LEDGER_ACTIONS.REJECTED_AMOUNT,
          amount: reportedAmount,
          currency: reportedCurrency || payment.currency,
          lipilaStatus,
          eventKey: `lipila:school_fee:${payment.id}:REJECTED_AMOUNT:${eventId || ref || lipilaStatus}`,
          metadata: match,
        })
        return { handled: false, reason: match.reason || 'amount_mismatch' }
      }
    }

    const ledgerAction = paid ? LEDGER_ACTIONS.PAID : LEDGER_ACTIONS.FAILED
    const ledger = await appendPaymentLedger({
      schoolId: payment.schoolId,
      paymentKind: 'school_fee',
      paymentId: payment.id,
      referenceId: ref || payment.referenceId,
      action: ledgerAction,
      amount: payment.amount,
      currency: payment.currency,
      lipilaStatus,
      eventKey: `lipila:school_fee:${payment.id}:${ledgerAction}:${eventId || ref || lipilaStatus}`,
    })
    if (ledger.duplicate && paid) {
      return { handled: true, type: 'school_fee_payment', reason: 'duplicate' }
    }

    await prisma.schoolFeePayment.updateMany({
      where: { id: payment.id, schoolId: payment.schoolId },
      data: {
        status: nextStatus,
        lipilaStatus,
        ...(ref ? { referenceId: ref } : {}),
      },
    })
    return { handled: true, type: 'school_fee_payment' }
  }

  if (identifier) {
    const payment = await prisma.schoolFeePayment.findFirst({
      where: { id: String(identifier), ...tenantFilter },
      select: {
        id: true,
        status: true,
        schoolId: true,
        referenceId: true,
        amount: true,
        currency: true,
      },
    })
    if (payment?.schoolId) {
      return applyToPayment(payment)
    }
  }

  if (ref) {
    const byRef = await prisma.schoolFeePayment.findFirst({
      where: { referenceId: ref, ...tenantFilter },
      select: {
        id: true,
        status: true,
        schoolId: true,
        referenceId: true,
        amount: true,
        currency: true,
      },
    })
    if (byRef?.schoolId) {
      return applyToPayment(byRef)
    }
  }

  return { handled: false }
}
