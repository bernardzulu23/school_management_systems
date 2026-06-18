import { z } from 'zod'
import crypto from 'crypto'

export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  evaluatePassword,
  passwordPolicyError,
  getPasswordFormError,
} from './passwordValidate'

import { evaluatePassword, PASSWORD_MIN_LENGTH } from './passwordValidate'

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
