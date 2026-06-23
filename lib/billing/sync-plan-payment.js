import prisma from '@/lib/prisma'
import { activatePlanPayment } from '@/lib/billing/activate-plan-payment'
import {
  extractLipilaStatus,
  isFailedLipilaStatus,
  isPaidLipilaStatus,
  lipilaCheckCollectionStatus,
} from '@/lib/payments/lipila'

/**
 * Poll Lipila check-status for a school plan upgrade and apply activation when settled.
 * @returns {Promise<'paid'|'failed'|'pending'|string>}
 */
export async function syncSchoolPlanPaymentFromLipila(payment) {
  if (!payment?.id) return String(payment?.status || 'pending').toLowerCase()

  const current = String(payment.status || '')
    .trim()
    .toLowerCase()
  if (current === 'paid' || current === 'failed') return current

  const referenceId = String(payment.referenceId || '').trim()
  if (!referenceId) return current || 'pending'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  const result = await lipilaCheckCollectionStatus(referenceId, { signal: controller.signal })
  clearTimeout(timeout)

  if (!result.ok || !result.data) return current || 'pending'

  const lipilaStatus = extractLipilaStatus(result.data)
  if (!isPaidLipilaStatus(lipilaStatus) && !isFailedLipilaStatus(lipilaStatus)) {
    return 'pending'
  }

  await activatePlanPayment({
    identifier: payment.id,
    referenceId,
    status: lipilaStatus,
  })

  const updated = await prisma.schoolPlanPayment.findUnique({
    where: { id: payment.id },
    select: { status: true },
  })
  return String(updated?.status || current || 'pending').toLowerCase()
}
