/** Client-safe Zambian phone normalization (no server imports). */

/**
 * Normalize to E.164 Zambia form (+260XXXXXXXXX).
 * Accepts 0977…, 977…, 260977…, +260977…, and mistaken +26… (11 digits).
 */
export function normalizeZmPhoneNumber(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  let digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null

  // Mistaken country code +26 / 26XXXXXXXXX (11 digits) → treat as +260 + 9-digit local
  if (digits.startsWith('26') && !digits.startsWith('260') && digits.length === 11) {
    digits = `260${digits.slice(2)}`
  }

  if (digits.startsWith('260') && digits.length >= 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`
  // 10 digits without leading 0 but looks like Zambian mobile (97/96/95/76…)
  if (digits.length === 10 && /^[79]/.test(digits)) return `+260${digits.slice(1)}`
  if (digits.length === 9 && /^[79]/.test(digits)) return `+260${digits}`

  if (raw.startsWith('+')) return `+${digits}`
  if (digits.startsWith('260')) return `+${digits}`

  return `+${digits}`
}

export function normalizePhoneNumbers(to) {
  const inputs = Array.isArray(to) ? to : [to]
  return Array.from(
    new Set(
      inputs
        .flatMap((v) =>
          String(v || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
        .map(normalizeZmPhoneNumber)
        .filter(Boolean)
    )
  )
}

/** Normalize parent/guardian contact fields before persisting on Student. */
export function normalizeParentContactFields(data = {}) {
  const out = { ...data }
  for (const key of [
    'parent_father_contact',
    'parent_mother_contact',
    'guardian_contact',
    'emergency_contact_phone',
  ]) {
    if (out[key] === undefined) continue
    if (out[key] === null || out[key] === '') {
      out[key] = null
      continue
    }
    out[key] = normalizeZmPhoneNumber(out[key])
  }
  return out
}
