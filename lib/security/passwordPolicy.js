import { z } from 'zod'
import crypto from 'crypto'

export const PASSWORD_MIN_LENGTH = 8

/** Human-readable rules enforced on every password set/change path. */
export const PASSWORD_REQUIREMENTS = [
  {
    key: 'minLength',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: 'hasUppercase',
    label: 'At least one uppercase letter (A–Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    key: 'hasLowercase',
    label: 'At least one lowercase letter (a–z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    key: 'hasNumber',
    label: 'At least one number (0–9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    key: 'hasSpecial',
    label: 'At least one special character (!@#$%^&*…)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
]

/**
 * Evaluate a password against the global policy.
 * @param {string} password
 * @returns {{ isValid: boolean, requirements: Record<string, boolean>, failures: string[], message: string | null }}
 */
export function evaluatePassword(password) {
  const pwd = String(password || '')
  const requirements = {}
  const failures = []

  for (const rule of PASSWORD_REQUIREMENTS) {
    const met = rule.test(pwd)
    requirements[rule.key] = met
    if (!met) failures.push(rule.label)
  }

  return {
    isValid: failures.length === 0,
    requirements,
    failures,
    message:
      failures.length > 0
        ? `Password does not meet security requirements: ${failures.join('; ')}`
        : null,
  }
}

/** @returns {string | null} First validation error, or null when compliant. */
export function passwordPolicyError(password) {
  return evaluatePassword(password).message
}

/** @param {string} password @returns {string | null} */
export function getPasswordFormError(password) {
  const result = evaluatePassword(password)
  return result.isValid ? null : result.failures[0] || 'Password does not meet requirements'
}

export const passwordSchema = z.string().superRefine((val, ctx) => {
  const result = evaluatePassword(val)
  if (!result.isValid) {
    for (const failure of result.failures) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: failure })
    }
  }
})

/** Password is optional; when provided it must meet the full policy. */
export const optionalPasswordSchema = z
  .string()
  .optional()
  .superRefine((val, ctx) => {
    if (val == null || val === '') return
    const result = evaluatePassword(val)
    if (!result.isValid) {
      for (const failure of result.failures) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: failure })
      }
    }
  })

/**
 * Generate a cryptographically random password that satisfies all policy rules.
 * @param {number} [length=16]
 */
export function generateCompliantPassword(length = 16) {
  const minLen = Math.max(length, PASSWORD_MIN_LENGTH)
  const lowers = 'abcdefghijklmnopqrstuvwxyz'
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const specials = '!@#$%^&*'
  const all = lowers + uppers + digits + specials

  const pick = (charset) => charset[crypto.randomBytes(1)[0] % charset.length]

  const required = [pick(lowers), pick(uppers), pick(digits), pick(specials)]
  const rest = Array.from({ length: minLen - required.length }, () => pick(all))
  const chars = [...required, ...rest]

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

/** Payload returned when login is denied due to a weak password. */
export function weakPasswordLoginPayload() {
  return {
    error: 'Password does not meet security requirements',
    message:
      'Your password is too weak. Use Forgot Password to set a new one with uppercase, lowercase, numbers, and special characters.',
    code: 'WEAK_PASSWORD',
  }
}
