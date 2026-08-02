import { describe, it, expect } from 'vitest'
import { toQstashDedupId } from '@/lib/sms/qstash'

describe('toQstashDedupId', () => {
  it('strips colons used in broadcast idempotency keys', () => {
    const id = toQstashDedupId('abc-uuid:+260977934996')
    expect(id).not.toContain(':')
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
    expect(id).toContain('260977934996')
  })

  it('collapses repeated separators and trims edges', () => {
    expect(toQstashDedupId('::foo::bar::')).toBe('foo-bar')
  })

  it('returns a fallback when empty', () => {
    expect(toQstashDedupId('')).toMatch(/^dedup-/)
  })
})
