/** Client-safe Zambian phone normalization (no server imports). */

export function normalizeZmPhoneNumber(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  const keepPlus = raw.startsWith('+')
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null

  if (keepPlus) return `+${digits}`
  if (digits.startsWith('260')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+260${digits.slice(1)}`
  if (digits.length === 9) return `+260${digits}`

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
