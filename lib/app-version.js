/** App release version (synced from package.json via next.config.js). */
export function getAppVersion() {
  return process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0'
}

export function getAppName() {
  return process.env.NEXT_PUBLIC_APP_NAME || 'Zambian School Management System'
}

/** Short git SHA when built on Vercel (helps confirm which deploy is live). */
export function getAppBuildId() {
  const sha = String(process.env.NEXT_PUBLIC_GIT_SHA || '').trim()
  return sha.length >= 7 ? sha.slice(0, 7) : ''
}

/** e.g. "2.1.0" or "2.1.0 (a1b2c3d)" */
export function getAppVersionLabel() {
  const version = getAppVersion()
  const buildId = getAppBuildId()
  return buildId ? `${version} (${buildId})` : version
}
