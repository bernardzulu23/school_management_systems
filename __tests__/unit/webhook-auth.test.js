import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  appendWebhookSecretToUrl,
  secretsEqual,
  verifySharedWebhookSecret,
} from '@/lib/security/webhookAuth'

describe('webhookAuth', () => {
  const prev = process.env.LIPILA_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.LIPILA_WEBHOOK_SECRET = 'super-secret-value'
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.LIPILA_WEBHOOK_SECRET
    else process.env.LIPILA_WEBHOOK_SECRET = prev
  })

  it('compares secrets in constant time', () => {
    expect(secretsEqual('abc', 'abc')).toBe(true)
    expect(secretsEqual('abc', 'abd')).toBe(false)
    expect(secretsEqual('', '')).toBe(false)
  })

  it('accepts Bearer and query secrets', () => {
    const bearerReq = {
      headers: { get: (n) => (n === 'authorization' ? 'Bearer super-secret-value' : null) },
      url: 'http://localhost/cb',
    }
    expect(verifySharedWebhookSecret(bearerReq, 'LIPILA_WEBHOOK_SECRET').ok).toBe(true)

    const queryReq = {
      headers: { get: () => null },
      url: 'http://localhost/cb?webhook_secret=super-secret-value',
    }
    expect(verifySharedWebhookSecret(queryReq, 'LIPILA_WEBHOOK_SECRET').ok).toBe(true)
  })

  it('rejects missing/wrong secrets and fail-closes when unset', () => {
    const bad = {
      headers: { get: () => null },
      url: 'http://localhost/cb',
    }
    expect(verifySharedWebhookSecret(bad, 'LIPILA_WEBHOOK_SECRET')).toMatchObject({
      ok: false,
      status: 401,
    })

    delete process.env.LIPILA_WEBHOOK_SECRET
    expect(verifySharedWebhookSecret(bad, 'LIPILA_WEBHOOK_SECRET')).toMatchObject({
      ok: false,
      status: 503,
    })
  })

  it('appends webhook_secret to callback URLs', () => {
    const url = appendWebhookSecretToUrl('https://example.com/api/payments/lipila/callback')
    expect(url).toContain('webhook_secret=super-secret-value')
  })
})
