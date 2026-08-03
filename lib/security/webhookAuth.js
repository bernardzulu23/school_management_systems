import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

/**
 * Constant-time string compare for webhook / cron secrets.
 */
export function secretsEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8')
  const right = Buffer.from(String(b || ''), 'utf8')
  if (left.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Shared-secret auth for provider webhooks (Lipila, Africa's Talking, etc.).
 *
 * Accepted credentials (first match wins):
 * - Authorization: Bearer <secret>
 * - x-webhook-secret: <secret>
 * - optional alias headers (e.g. x-lipila-webhook-secret)
 * - query ?webhook_secret= / ?secret= (for providers that cannot set headers; put secret in callback URL)
 *
 * Fail-closed when the env var is missing or empty.
 *
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function verifySharedWebhookSecret(request, envVarName, { aliasHeaders = [] } = {}) {
  const expected = String(process.env[envVarName] || '').trim()
  if (!expected) {
    return { ok: false, status: 503, error: `${envVarName} is not configured` }
  }

  const authHeader = String(request.headers.get('authorization') || '').trim()
  let provided = ''
  if (/^Bearer\s+\S+/i.test(authHeader)) {
    provided = authHeader.replace(/^Bearer\s+/i, '').trim()
  }
  if (!provided) {
    provided = String(request.headers.get('x-webhook-secret') || '').trim()
  }
  for (const headerName of aliasHeaders) {
    if (provided) break
    provided = String(request.headers.get(headerName) || '').trim()
  }
  if (!provided) {
    try {
      const url = new URL(request.url)
      provided = String(
        url.searchParams.get('webhook_secret') || url.searchParams.get('secret') || ''
      ).trim()
    } catch {
      provided = ''
    }
  }

  if (!secretsEqual(provided, expected)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

export function unauthorizedWebhookResponse(result) {
  return NextResponse.json(
    { success: false, error: result?.error || 'Unauthorized' },
    { status: result?.status || 401 }
  )
}

/**
 * Append webhook_secret to a provider callback URL when the env secret is set.
 * Use for gateways (e.g. Lipila) that cannot send custom auth headers.
 */
export function appendWebhookSecretToUrl(url, envVarName = 'LIPILA_WEBHOOK_SECRET') {
  const secret = String(process.env[envVarName] || '').trim()
  const base = String(url || '').trim()
  if (!secret || !base) return base
  try {
    const u = new URL(base)
    if (!u.searchParams.get('webhook_secret') && !u.searchParams.get('secret')) {
      u.searchParams.set('webhook_secret', secret)
    }
    return u.toString()
  } catch {
    const join = base.includes('?') ? '&' : '?'
    return `${base}${join}webhook_secret=${encodeURIComponent(secret)}`
  }
}
