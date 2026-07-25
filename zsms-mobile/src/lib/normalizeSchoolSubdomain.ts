/**
 * Accept subdomain, hostname, or full school URL and return the tenant slug.
 * Shared by Expo school-select + login.
 */
export function normalizeSchoolSubdomain(
  input: string,
  apexDomain = 'bluepeacktechnologies.com'
): string {
  let raw = String(input || '')
    .trim()
    .toLowerCase()
  if (!raw) return ''

  try {
    if (raw.includes('://') || raw.startsWith('www.')) {
      const withProtocol = raw.includes('://') ? raw : `https://${raw}`
      raw = new URL(withProtocol).hostname
    }
  } catch {
    // keep raw
  }

  raw = raw.split('/')[0].split('?')[0].split('#')[0].split(':')[0]

  const apex = String(apexDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')

  if (raw === apex || raw === `www.${apex}`) return ''
  if (apex && raw.endsWith(`.${apex}`)) {
    raw = raw.slice(0, -(apex.length + 1))
  }

  if (raw.includes('.')) {
    raw = raw.split('.')[0]
  }

  return raw
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}
