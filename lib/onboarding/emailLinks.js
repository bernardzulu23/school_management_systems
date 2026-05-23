/**
 * Build onboarding verification URLs that work on production and local dev.
 */
export function getOnboardingVerifyUrl(request, token) {
  const safeToken = String(token || '').trim()
  const host = String(request?.headers?.get?.('host') || '').trim()
  const isLocal =
    !host ||
    host.includes('localhost') ||
    host.startsWith('127.0.0.1') ||
    /^[0-9.]+:\d+$/.test(host)

  if (host && !isLocal) {
    return `https://${host}/api/onboarding/verify/${safeToken}`
  }

  const baseDomain = String(
    process.env.APP_BASE_DOMAIN ||
      process.env.BASE_DOMAIN ||
      process.env.COOKIE_DOMAIN ||
      'bluepeacktechnologies.com'
  )
    .trim()
    .replace(/^\./, '')

  return `https://${baseDomain}/api/onboarding/verify/${safeToken}`
}
