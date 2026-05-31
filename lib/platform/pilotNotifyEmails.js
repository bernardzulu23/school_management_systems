/**
 * Inboxes that receive alerts when a school joins the pilot (free trial) program.
 * Set PILOT_NOTIFY_EMAILS (comma-separated). Falls back to platform admin / EMAIL_INFO.
 */
export function getPilotNotifyRecipients() {
  const fromEnv = (process.env.PILOT_NOTIFY_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

  if (fromEnv.length) return [...new Set(fromEnv)]

  const platform = (process.env.PLATFORM_ADMIN_EMAILS || process.env.PLATFORM_ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

  if (platform.length) return [...new Set(platform)]

  const info = String(process.env.EMAIL_INFO || '')
    .trim()
    .toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info)) return [info]

  return []
}
