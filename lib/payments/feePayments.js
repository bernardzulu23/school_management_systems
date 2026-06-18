import prisma from '@/lib/prisma'
import { isFailedLipilaStatus, isPaidLipilaStatus } from '@/lib/payments/lipila'

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
 * @returns {Promise<{ handled: boolean, type?: string }>}
 */
export async function activateFeePayment({ identifier, referenceId, status }) {
  const paid = isPaidLipilaStatus(status)
  const failed = isFailedLipilaStatus(status)
  if (!paid && !failed) return { handled: false }

  const lipilaStatus = String(status || '').trim()
  const nextStatus = feeStatusFromLipila(lipilaStatus)

  if (identifier) {
    const payment = await prisma.schoolFeePayment.findUnique({
      where: { id: identifier },
      select: { id: true, status: true },
    })
    if (payment) {
      if (payment.status === 'completed' && paid) {
        return { handled: true, type: 'school_fee_payment' }
      }
      await prisma.schoolFeePayment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          lipilaStatus,
          ...(referenceId ? { referenceId } : {}),
        },
      })
      return { handled: true, type: 'school_fee_payment' }
    }
  }

  const ref = String(referenceId || '').trim()
  if (ref) {
    const byRef = await prisma.schoolFeePayment.findFirst({
      where: { referenceId: ref },
      select: { id: true, status: true },
    })
    if (byRef) {
      if (byRef.status === 'completed' && paid) {
        return { handled: true, type: 'school_fee_payment' }
      }
      await prisma.schoolFeePayment.update({
        where: { id: byRef.id },
        data: { status: nextStatus, lipilaStatus },
      })
      return { handled: true, type: 'school_fee_payment' }
    }
  }

  return { handled: false }
}
