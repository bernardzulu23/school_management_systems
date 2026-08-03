import { describe, expect, it } from 'vitest'
import { parseLipilaCallbackPayload } from '@/lib/payments/lipilaCallback'

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
    })
  })

  it('rejects object operator-style identifier', () => {
    const parsed = parseLipilaCallbackPayload({
      identifier: { $ne: null },
      status: 'Successful',
    })
    expect(parsed.ok).toBe(false)
  })

  it('reads nested data fields', () => {
    const parsed = parseLipilaCallbackPayload({
      data: { internal_id: 'abc_123', reference_id: 'REF-9', status: 'paid' },
    })
    expect(parsed).toMatchObject({
      ok: true,
      identifier: 'abc_123',
      referenceId: 'REF-9',
      status: 'paid',
    })
  })
})
