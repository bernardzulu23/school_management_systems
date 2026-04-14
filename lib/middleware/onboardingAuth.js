import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'

export function signOnboardingToken(registrationId) {
  const id = String(registrationId || '').trim()
  return jwt.sign({ rid: id }, JWT_SECRET, { expiresIn: '2d' })
}

export function verifyOnboardingToken(token) {
  const t = String(token || '').trim()
  if (!t) return null
  try {
    const decoded = jwt.verify(t, JWT_SECRET)
    const rid = String(decoded?.rid || '').trim()
    return rid || null
  } catch {
    return null
  }
}
