/**
 * Append-only payment reconciliation ledger (Phase 6).
 * Never update or delete ledger rows — insert only.
 */
import { basePrisma } from '@/lib/prisma/client'
import { runAsPlatform } from '@/lib/tenant/context'

export const LEDGER_ACTIONS = {
  INITIATED: 'INITIATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  DUPLICATE: 'DUPLICATE',
  REJECTED_AMOUNT: 'REJECTED_AMOUNT',
  REJECTED_STATUS: 'REJECTED_STATUS',
  ADJUSTMENT: 'ADJUSTMENT',
}

/**
 * @param {{
 *   schoolId?: string | null
 *   provider?: string
 *   paymentKind: string
 *   paymentId: string
 *   referenceId?: string | null
 *   action: string
 *   amount?: number | null
 *   currency?: string | null
 *   lipilaStatus?: string | null
 *   metadata?: object
 *   eventKey?: string
 * }} entry
 * @returns {Promise<{ inserted: boolean, duplicate?: boolean, id?: string }>}
 */
export async function appendPaymentLedger(entry) {
  const provider = String(entry.provider || 'lipila').trim() || 'lipila'
  const paymentId = String(entry.paymentId || '').trim()
  const action = String(entry.action || '').trim()
  if (!paymentId || !action) return { inserted: false }

  const eventKey =
    String(entry.eventKey || '').trim() ||
    [
      provider,
      entry.paymentKind || 'unknown',
      paymentId,
      action,
      String(entry.referenceId || entry.lipilaStatus || 'none').trim(),
    ].join(':')

  try {
    const row = await runAsPlatform(() =>
      basePrisma.paymentLedgerEntry.create({
        data: {
          schoolId: entry.schoolId ? String(entry.schoolId) : null,
          provider,
          paymentKind: String(entry.paymentKind || 'unknown').slice(0, 64),
          paymentId,
          referenceId: entry.referenceId ? String(entry.referenceId).slice(0, 256) : null,
          eventKey: eventKey.slice(0, 512),
          action: action.slice(0, 64),
          amount:
            entry.amount != null && Number.isFinite(Number(entry.amount))
              ? Number(entry.amount)
              : null,
          currency: entry.currency ? String(entry.currency).slice(0, 8) : null,
          lipilaStatus: entry.lipilaStatus ? String(entry.lipilaStatus).slice(0, 64) : null,
          metadata:
            entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : undefined,
        },
      })
    )
    return { inserted: true, id: row.id }
  } catch (err) {
    if (err?.code === 'P2002') {
      return { inserted: false, duplicate: true }
    }
    console.warn('[paymentLedger] append failed:', err?.message || err)
    return { inserted: false }
  }
}

/**
 * Compare webhook/provider amount+currency to the stored expected payment.
 * Amounts within 0.01 (or 1 for integer plan amounts) are accepted.
 *
 * @param {{ amount: number, currency?: string|null }} expected
 * @param {{ amount?: number|null, currency?: string|null }} reported
 * @param {{ amountTolerance?: number }} [opts]
 */
export function amountsMatchExpected(expected, reported, opts = {}) {
  const expectedAmount = Number(expected?.amount)
  if (!Number.isFinite(expectedAmount)) {
    return { ok: false, reason: 'missing_expected_amount' }
  }

  const expectedCurrency =
    String(expected?.currency || 'ZMW')
      .trim()
      .toUpperCase() || 'ZMW'
  const reportedCurrency = reported?.currency
    ? String(reported.currency).trim().toUpperCase()
    : null

  if (reportedCurrency && reportedCurrency !== expectedCurrency) {
    return {
      ok: false,
      reason: 'currency_mismatch',
      expected: expectedCurrency,
      reported: reportedCurrency,
    }
  }

  if (reported?.amount == null || reported.amount === '') {
    // Provider omitted amount — rely on stored expected + authenticated status.
    return { ok: true, omitted: true, expectedAmount, expectedCurrency }
  }

  const reportedAmount = Number(reported.amount)
  if (!Number.isFinite(reportedAmount)) {
    return { ok: false, reason: 'invalid_reported_amount' }
  }

  const tolerance = opts.amountTolerance ?? (Number.isInteger(expectedAmount) ? 0 : 0.01)
  if (Math.abs(reportedAmount - expectedAmount) > tolerance) {
    return {
      ok: false,
      reason: 'amount_mismatch',
      expected: expectedAmount,
      reported: reportedAmount,
    }
  }

  return { ok: true, expectedAmount, expectedCurrency, reportedAmount }
}

/** Terminal paid statuses that must not regress to failed. */
export function isTerminalPaidStatus(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase()
  return s === 'completed' || s === 'paid'
}
