'use client'

import { evaluatePassword, PASSWORD_REQUIREMENTS } from '@/lib/security/passwordPolicy'

export { evaluatePassword }

/**
 * Live checklist of password policy requirements.
 * @param {{ password: string, className?: string }} props
 */
export default function PasswordRequirements({ password, className = '' }) {
  const { requirements } = evaluatePassword(password)

  return (
    <div
      className={`p-4 bg-royalPurple-accent rounded-lg border border-royalPurple-border2 ${className}`}
    >
      <h4 className="font-medium text-royalPurple-accentTx mb-2">Password requirements</h4>
      <ul className="text-sm text-royalPurple-accentTx space-y-1">
        {PASSWORD_REQUIREMENTS.map((rule) => {
          const met = requirements[rule.key]
          return (
            <li key={rule.key} className={met ? 'text-green-700' : ''}>
              {met ? '✓' : '○'} {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** @param {string} password @returns {string | null} */
export function getPasswordFormError(password) {
  const result = evaluatePassword(password)
  return result.isValid ? null : result.failures[0] || 'Password does not meet requirements'
}
