/**
 * Lipila mobile money collections — shared server helpers.
 * @see https://blaze-docs.lipila.dev/docs/collections/momocollections.html
 */

export const LIPILA_PROVIDER_PAYMENT_TYPES = {
  airtel: 'AirtelMoney',
  mtn: 'MtnMoney',
  zamtel: 'ZamtelKwacha',
}

export function getLipilaConfig() {
  const apiKey = String(process.env.LIPILA_API_KEY || process.env.LIPILA_SECRET_KEY || '').trim()
  const baseUrl = String(
    process.env.LIPILA_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://blz.lipila.io' : 'https://api.lipila.dev')
  ).trim()
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, '') }
}

export function isPaidLipilaStatus(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase()
  return s === 'paid' || s === 'success' || s === 'successful' || s === 'completed'
}

export function isFailedLipilaStatus(status) {
  const s = String(status || '')
    .trim()
    .toLowerCase()
  return s === 'failed' || s === 'rejected' || s === 'cancelled' || s === 'canceled'
}

export function extractGatewayReferenceId(payload) {
  const p = payload || {}
  const v = String(
    p.referenceId ||
      p.reference_id ||
      p?.data?.referenceId ||
      p?.data?.reference_id ||
      p?.transactionId ||
      p?.transaction_id ||
      p?.data?.transactionId ||
      p?.data?.transaction_id ||
      ''
  ).trim()
  return v || null
}

export function extractLipilaStatus(payload) {
  return String(payload?.status || payload?.data?.status || '').trim()
}

export async function lipilaRequest(path, { method = 'GET', body, signal } = {}) {
  const { apiKey, baseUrl } = getLipilaConfig()
  if (!apiKey) {
    return { ok: false, status: 0, data: null, error: 'Lipila API key is not configured' }
  }

  const headers = {
    accept: 'application/json',
    'x-api-key': apiKey,
    'User-Agent': 'ZSMS-Server',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (body?.callbackUrl) {
    headers.callbackUrl = String(body.callbackUrl)
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const contentType = String(response.headers.get('content-type') || '')
    const raw = await response.text().catch(() => '')
    let data = null
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = { raw }
      }
    }
    if (!response.ok) {
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.error === 'string'
            ? data.error
            : `Lipila request failed (${response.status})`
      return { ok: false, status: response.status, data, error: msg }
    }
    return { ok: true, status: response.status, data, error: null }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, status: 0, data: null, error: 'Payment gateway timeout' }
    }
    return { ok: false, status: 0, data: null, error: 'Payment gateway unavailable' }
  }
}

export async function lipilaCreateMobileMoneyCollection(payload, { signal } = {}) {
  return lipilaRequest('/api/v1/collections/mobile-money', {
    method: 'POST',
    body: payload,
    signal,
  })
}

export async function lipilaCheckCollectionStatus(referenceId, { signal } = {}) {
  const ref = String(referenceId || '').trim()
  if (!ref) return { ok: false, status: 400, data: null, error: 'Missing referenceId' }
  const q = new URLSearchParams({ referenceId: ref })
  return lipilaRequest(`/api/v1/collections/check-status?${q.toString()}`, { signal })
}

/**
 * Sync onboarding registration paymentStatus from Lipila check-status API.
 * Returns updated paymentStatus string or null if no sync performed.
 */
export async function syncOnboardingPaymentFromLipila(registration) {
  if (!registration?.id) return null
  const plan = String(registration.plan || '')
    .trim()
    .toLowerCase()
  if (plan === 'trial') return String(registration.paymentStatus || '').toLowerCase()

  const current = String(registration.paymentStatus || '')
    .trim()
    .toLowerCase()
  if (current === 'paid') return 'paid'

  const referenceId = String(registration.paymentReference || '').trim()
  if (!referenceId) return current || 'unpaid'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  const result = await lipilaCheckCollectionStatus(referenceId, { signal: controller.signal })
  clearTimeout(timeout)

  if (!result.ok || !result.data) return current || 'unpaid'

  const status = extractLipilaStatus(result.data)
  const prisma = (await import('@/lib/prisma')).default

  if (isPaidLipilaStatus(status)) {
    await prisma.schoolRegistration.update({
      where: { id: registration.id },
      data: { paymentStatus: 'paid' },
    })
    return 'paid'
  }

  if (isFailedLipilaStatus(status)) {
    await prisma.schoolRegistration.update({
      where: { id: registration.id },
      data: { paymentStatus: 'failed' },
    })
    return 'failed'
  }

  if (current !== 'pending') {
    await prisma.schoolRegistration.update({
      where: { id: registration.id },
      data: { paymentStatus: 'pending' },
    })
  }
  return 'pending'
}
