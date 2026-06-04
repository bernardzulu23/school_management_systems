/** App release version (synced from package.json via next.config.js). */
export function getAppVersion() {
  return process.env.NEXT_PUBLIC_APP_VERSION || '2.0.3'
}

export function getAppName() {
  return process.env.NEXT_PUBLIC_APP_NAME || 'Zambian School Management System'
}
