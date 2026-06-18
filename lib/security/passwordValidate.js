/**
 * Client-safe password validation (no Node.js crypto).
 * Import this from React components — not passwordPolicy.js.
 */

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
