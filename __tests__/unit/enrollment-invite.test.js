import { describe, it, expect } from 'vitest'
import { normalizeInviteCode } from '@/lib/solo/enrollmentInvites'

describe('Enrollment invite utilities', () => {
  it('normalizes invite codes to uppercase alphanumeric', () => {
    expect(normalizeInviteCode(' ab-c123 ')).toBe('ABC123')
    expect(normalizeInviteCode('')).toBe('')
  })
})
