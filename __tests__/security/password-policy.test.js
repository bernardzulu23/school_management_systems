import { describe, it, expect } from 'vitest'
import {
  evaluatePassword,
  passwordPolicyError,
  generateCompliantPassword,
  PASSWORD_MIN_LENGTH,
} from '@/lib/security/passwordPolicy'

describe('passwordPolicy', () => {
  it('rejects passwords missing required character classes', () => {
    expect(evaluatePassword('short').isValid).toBe(false)
    expect(evaluatePassword('alllowercase1!').isValid).toBe(false)
    expect(evaluatePassword('ALLUPPERCASE1!').isValid).toBe(false)
    expect(evaluatePassword('NoNumbers!').isValid).toBe(false)
    expect(evaluatePassword('NoSpecial1').isValid).toBe(false)
  })

  it('accepts passwords that meet every rule', () => {
    expect(evaluatePassword('SecureP@ss1').isValid).toBe(true)
    expect(passwordPolicyError('SecureP@ss1')).toBeNull()
  })

  it('enforces minimum length', () => {
    expect(evaluatePassword('Aa1!xyz').isValid).toBe(false)
    expect(evaluatePassword('Aa1!xyza').isValid).toBe(true)
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })

  it('generateCompliantPassword always satisfies policy', () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generateCompliantPassword()
      expect(evaluatePassword(pwd).isValid).toBe(true)
    }
  })
})
