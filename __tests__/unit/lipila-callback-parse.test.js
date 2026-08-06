import { createHmac } from 'crypto'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  parseLipilaCallbackPayload,
  verifyLipilaWebhookRequest,
} from '@/lib/payments/lipilaCallback'
import { amountsMatchExpected, isTerminalPaidStatus } from '@/lib/payments/paymentLedger'

describe('parseLipilaCallbackPayload', () => {
  it('accepts string identifier and referenceId', () => {
    const parsed = parseLipilaCallbackPayload({
      identifier: 'reg-test-001',
      referenceId: 'LPLXC-1',
      status: 'Successful',
    })
    expect(parsed).toEqual({
      ok: true,
      identifier: 'reg-test-001',
      referenceId: 'LPLXC-1',
      status: 'Successful',
      amount: null,
      currency: null,
      eventId: null,
    })
  })

  it('rejects object operator-style identifier', () => {
    const parsed = parseLipilaCallbackPayload({
      identifier: { $ne: null },
      status: 'Successful',
    })
    expect(parsed.ok).toBe(false)
  })

  it('reads nested data fields including amount/currency', () => {
    const parsed = parseLipilaCallbackPayload({
      data: {
        internal_id: 'abc_123',
        reference_id: 'REF-9',
        status: 'paid',
        amount: '150.50',
        currency: 'zmw',
        event_id: 'evt-1',
      },
    })
    expect(parsed).toMatchObject({
      ok: true,
      identifier: 'abc_123',
      referenceId: 'REF-9',
      status: 'paid',
      amount: 150.5,
      currency: 'ZMW',
      eventId: 'evt-1',
    })
  })
})

describe('amountsMatchExpected', () => {
  it('accepts matching amounts and omitted provider amount', () => {
    expect(
      amountsMatchExpected({ amount: 100, currency: 'ZMW' }, { amount: 100, currency: 'ZMW' }).ok
    ).toBe(true)
    expect(amountsMatchExpected({ amount: 100, currency: 'ZMW' }, {}).ok).toBe(true)
  })

  it('rejects currency or amount mismatch', () => {
    expect(
      amountsMatchExpected({ amount: 100, currency: 'ZMW' }, { amount: 100, currency: 'USD' }).ok
    ).toBe(false)
    expect(
      amountsMatchExpected({ amount: 100, currency: 'ZMW' }, { amount: 99, currency: 'ZMW' }).ok
    ).toBe(false)
  })
})

describe('isTerminalPaidStatus', () => {
  it('treats completed/paid as terminal', () => {
    expect(isTerminalPaidStatus('completed')).toBe(true)
    expect(isTerminalPaidStatus('paid')).toBe(true)
    expect(isTerminalPaidStatus('pending')).toBe(false)
  })
})

describe('verifyLipilaWebhookRequest', () => {
  const prevSecret = process.env.LIPILA_WEBHOOK_SECRET
  const prevHmac = process.env.LIPILA_WEBHOOK_HMAC_SECRET
  const prevRequire = process.env.LIPILA_REQUIRE_HMAC

  beforeEach(() => {
    process.env.LIPILA_WEBHOOK_SECRET = 'super-secret-value'
    delete process.env.LIPILA_WEBHOOK_HMAC_SECRET
    delete process.env.LIPILA_REQUIRE_HMAC
  })

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.LIPILA_WEBHOOK_SECRET
    else process.env.LIPILA_WEBHOOK_SECRET = prevSecret
    if (prevHmac === undefined) delete process.env.LIPILA_WEBHOOK_HMAC_SECRET
    else process.env.LIPILA_WEBHOOK_HMAC_SECRET = prevHmac
    if (prevRequire === undefined) delete process.env.LIPILA_REQUIRE_HMAC
    else process.env.LIPILA_REQUIRE_HMAC = prevRequire
  })

  it('rejects unsigned callbacks', () => {
    const req = { headers: { get: () => null }, url: 'http://localhost/cb' }
    expect(verifyLipilaWebhookRequest(req, '{}')).toMatchObject({ ok: false, status: 401 })
  })

  it('accepts shared secret and optional HMAC', () => {
    const body = '{"status":"paid"}'
    const bearerReq = {
      headers: { get: (n) => (n === 'authorization' ? 'Bearer super-secret-value' : null) },
      url: 'http://localhost/cb',
    }
    expect(verifyLipilaWebhookRequest(bearerReq, body).ok).toBe(true)

    process.env.LIPILA_WEBHOOK_HMAC_SECRET = 'hmac-secret'
    process.env.LIPILA_REQUIRE_HMAC = 'true'
    const sig = createHmac('sha256', 'hmac-secret').update(body, 'utf8').digest('hex')
    const signedReq = {
      headers: {
        get: (n) => {
          if (n === 'authorization') return 'Bearer super-secret-value'
          if (n === 'x-lipila-signature') return sig
          return null
        },
      },
      url: 'http://localhost/cb',
    }
    expect(verifyLipilaWebhookRequest(signedReq, body).ok).toBe(true)

    const badSig = {
      headers: {
        get: (n) => {
          if (n === 'authorization') return 'Bearer super-secret-value'
          if (n === 'x-lipila-signature') return 'deadbeef'
          return null
        },
      },
      url: 'http://localhost/cb',
    }
    expect(verifyLipilaWebhookRequest(badSig, body)).toMatchObject({ ok: false, status: 401 })
  })
})
