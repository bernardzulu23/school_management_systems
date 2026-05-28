/**
 * Reporting streams segment schools by province + district for monitoring and future admin scopes.
 * Stream key format: `province-slug__district-slug` (stable, indexable).
 */
import { normalizeZambiaProvince } from '@/lib/platform/zambiaProvinces'
import { normalizeDistrict } from '@/lib/platform/zambiaDistricts'

function slugPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Build a unique reporting stream key for province + district.
 * @param {string} province
 * @param {string} district
 * @returns {string | null}
 */
export function buildReportingStreamKey(province, district) {
  const p = normalizeZambiaProvince(province)
  const d = normalizeDistrict(district, p)
  if (!p || !d) return null
  const ps = slugPart(p)
  const ds = slugPart(d)
  if (!ps || !ds) return null
  return `${ps}__${ds}`
}

/**
 * @param {string} key
 * @returns {{ province: string, district: string } | null}
 */
export function parseReportingStreamKey(key) {
  const raw = String(key || '').trim()
  if (!raw.includes('__')) return null
  const [pSlug, dSlug] = raw.split('__')
  if (!pSlug || !dSlug) return null
  const title = (s) =>
    s
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  return {
    province: title(pSlug),
    district: title(dSlug),
  }
}

/**
 * Human label for a reporting stream.
 * @param {string} province
 * @param {string} district
 */
export function reportingStreamLabel(province, district) {
  const p = normalizeZambiaProvince(province)
  const d = normalizeDistrict(district, p)
  if (!p || !d) return 'Unassigned'
  return `${p} — ${d}`
}

/**
 * Validate location for school onboarding.
 * @param {{ province?: string, district?: string }} input
 * @returns {{ ok: boolean, error?: string, province?: string, district?: string, reportingStreamKey?: string }}
 */
export function validateSchoolLocation(input) {
  const province = normalizeZambiaProvince(input?.province)
  const district = normalizeDistrict(input?.district, province)

  if (!province) {
    return { ok: false, error: 'Province is required' }
  }
  if (!district) {
    return { ok: false, error: 'District is required' }
  }

  const reportingStreamKey = buildReportingStreamKey(province, district)
  if (!reportingStreamKey) {
    return { ok: false, error: 'Could not assign reporting stream' }
  }

  return { ok: true, province, district, reportingStreamKey }
}
