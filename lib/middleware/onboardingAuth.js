import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-replace-in-prod'

const ONBOARDING_AUDIENCE = 'zsms-onboarding'

export function signOnboardingToken(registrationId) {
  const id = String(registrationId || '').trim()
  return jwt.sign({ rid: id }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '2d',
    audience: ONBOARDING_AUDIENCE,
  })
}

export function verifyOnboardingToken(token) {
  const t = String(token || '').trim()
  if (!t) return null
  try {
    // Accept legacy tokens (no audience) during transition; reject a wrong one.
    const decoded = jwt.verify(t, JWT_SECRET, { algorithms: ['HS256'] })
    if (decoded?.aud && decoded.aud !== ONBOARDING_AUDIENCE) return null
    const rid = String(decoded?.rid || '').trim()
    return rid || null
  } catch {
    return null
  }
}
