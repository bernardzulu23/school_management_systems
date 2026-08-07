/**
 * IP geolocation + threat enrichment (IPInfo + IPGeolocation).
 * Never throws — returns safe defaults on failure / private IPs.
 */
import { LRUCache } from 'lru-cache'

const cache = new LRUCache({
  max: 2000,
  ttl: 6 * 60 * 60 * 1000, // 6h
})

const EMPTY = {
  country: null,
  city: null,
  region: null,
  isp: null,
  isVpn: false,
  isTor: false,
  isProxy: false,
  threatScore: null,
}

function isPrivateOrUnknown(ip) {
  const s = String(ip || '')
    .trim()
    .toLowerCase()
  if (!s || s === 'unknown' || s === 'system' || s === '::1' || s === '127.0.0.1') return true
  if (s.startsWith('10.') || s.startsWith('192.168.') || s.startsWith('172.')) {
    // 172.16–31.x.x
    if (s.startsWith('172.')) {
      const second = Number(s.split('.')[1])
      if (second >= 16 && second <= 31) return true
    } else {
      return true
    }
  }
  if (s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80')) return true
  return false
}

async function fetchJson(url, timeoutMs = 4000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/**
 * @param {string} ip
 * @returns {Promise<{
 *   country: string|null,
 *   city: string|null,
 *   region: string|null,
 *   isp: string|null,
 *   isVpn: boolean,
 *   isTor: boolean,
 *   isProxy: boolean,
 *   threatScore: number|null
 * }>}
 */
export async function enrichIp(ip) {
  const clean = String(ip || '')
    .trim()
    .split(',')[0]
    ?.trim()
  if (isPrivateOrUnknown(clean)) return { ...EMPTY }

  const cached = cache.get(clean)
  if (cached) return cached

  const out = { ...EMPTY }

  try {
    const token = String(process.env.IPINFO_TOKEN || '').trim()
    const ipinfoUrl = token
      ? `https://ipinfo.io/${encodeURIComponent(clean)}/json?token=${encodeURIComponent(token)}`
      : `https://ipinfo.io/${encodeURIComponent(clean)}/json`

    const info = await fetchJson(ipinfoUrl)
    if (info && typeof info === 'object') {
      out.country = info.country ? String(info.country) : null
      out.city = info.city ? String(info.city) : null
      out.region = info.region ? String(info.region) : null
      out.isp = info.org ? String(info.org) : info.asn?.name ? String(info.asn.name) : null
    }

    const geoKey = String(process.env.IPGEO_API_KEY || '').trim()
    if (geoKey) {
      const geoUrl =
        `https://api.ipgeolocation.io/v2/ipgeo?apiKey=${encodeURIComponent(geoKey)}` +
        `&ip=${encodeURIComponent(clean)}&fields=security`
      const geo = await fetchJson(geoUrl)
      const sec = geo?.security || geo
      if (sec && typeof sec === 'object') {
        out.isVpn = Boolean(sec.is_vpn || sec.isVpn)
        out.isTor = Boolean(sec.is_tor || sec.isTor)
        out.isProxy = Boolean(sec.is_proxy || sec.isProxy || sec.is_anonymous)
        const score = sec.threat_score ?? sec.threatScore ?? sec.risk_score ?? sec.riskScore ?? null
        if (score != null && Number.isFinite(Number(score))) {
          out.threatScore = Math.max(0, Math.min(100, Math.round(Number(score))))
        }
      }
      // Fill missing geo from ipgeolocation if IPInfo failed
      if (!out.country && geo?.country_code2) out.country = String(geo.country_code2)
      if (!out.city && geo?.city) out.city = String(geo.city)
      if (!out.region && geo?.state_prov) out.region = String(geo.state_prov)
      if (!out.isp && geo?.isp) out.isp = String(geo.isp)
    }

    // Heuristic bump when VPN/Tor without provider score
    if (out.threatScore == null && (out.isVpn || out.isTor || out.isProxy)) {
      out.threatScore = out.isTor ? 90 : out.isVpn ? 65 : 55
    }
  } catch {
    // swallow
  }

  cache.set(clean, out)
  return out
}

/** @internal Test helper */
export function clearIpIntelligenceCache() {
  cache.clear()
}
