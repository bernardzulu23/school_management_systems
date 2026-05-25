/**
 * Mobile money provider logos — MTN, Airtel, Zamtel.
 *
 * Add image files under: public/payments/
 *   - mtn.png / mtn.jpg / mtn.jpeg / mtn.svg
 *   - airtel.png / airtel.jpg / airtel.jpeg / airtel.svg
 *   - zamtel.png / zamtel.jpg / zamtel.jpeg / zamtel.svg
 *
 * Or set full URLs in .env (jpeg, jpg, png, svg, webp supported):
 *   NEXT_PUBLIC_PAYMENT_LOGO_MTN=https://...
 *   NEXT_PUBLIC_PAYMENT_LOGO_AIRTEL=https://...
 *   NEXT_PUBLIC_PAYMENT_LOGO_ZAMTEL=https://...
 */

export const PAYMENT_PROVIDERS = [
  { key: 'mtn', name: 'MTN Zambia', label: 'MTN Zambia' },
  { key: 'airtel', name: 'Airtel Zambia', label: 'Airtel Zambia' },
  { key: 'zamtel', name: 'Zamtel', label: 'Zamtel' },
]

const ENV_LOGO_KEYS = {
  mtn: 'NEXT_PUBLIC_PAYMENT_LOGO_MTN',
  airtel: 'NEXT_PUBLIC_PAYMENT_LOGO_AIRTEL',
  zamtel: 'NEXT_PUBLIC_PAYMENT_LOGO_ZAMTEL',
}

/** Allowed image extensions for logo URLs and static files */
export const PAYMENT_LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp']

const EXT_PATTERN = new RegExp(`\\.(${PAYMENT_LOGO_EXTENSIONS.join('|')})$`, 'i')

export function isAllowedPaymentLogoUrl(url) {
  const s = String(url || '').trim()
  if (!s) return false
  if (s.startsWith('/')) return EXT_PATTERN.test(s)
  try {
    const u = new URL(s)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    return EXT_PATTERN.test(u.pathname)
  } catch {
    return false
  }
}

function envLogo(key) {
  const envKey = ENV_LOGO_KEYS[key]
  if (!envKey || typeof process === 'undefined') return null
  const raw = process.env[envKey]
  const url = String(raw || '').trim()
  return isAllowedPaymentLogoUrl(url) ? url : null
}

/** Default static paths — first existing extension wins at build time (png preferred). */
const DEFAULT_LOCAL = {
  mtn: '/payments/mtn.png',
  airtel: '/payments/airtel.png',
  zamtel: '/payments/zamtel.png',
}

const FALLBACK_LOCAL = {
  mtn: '/payments/mtn.svg',
  airtel: '/payments/airtel.svg',
  zamtel: '/payments/zamtel.svg',
}

export function getPaymentProviderLogoSrc(key) {
  const fromEnv = envLogo(key)
  if (fromEnv) return fromEnv
  return DEFAULT_LOCAL[key] || FALLBACK_LOCAL[key] || `/payments/${key}.png`
}

export function getPaymentProvidersWithLogos() {
  return PAYMENT_PROVIDERS.map((p) => ({
    ...p,
    src: getPaymentProviderLogoSrc(p.key),
  }))
}
