/**
 * Phase 5 parent offline helpers (read-cache only — payments stay online).
 */
import { resultsStore } from '@/lib/offline/results-store'
import { isBrowserOnline, isNetworkFailure } from '@/lib/offline/network'
import { CACHE_KEYS } from '@/lib/offline/sync-contracts'

export { CACHE_KEYS }

export async function cacheParentJson(key, data) {
  return resultsStore.cacheJson(key, data)
}

export async function getCachedParentJson(key) {
  return resultsStore.getCachedJson(key)
}

export function parentChildrenCacheKey() {
  return CACHE_KEYS.parentChildren
}

export function parentChildCacheKey(studentId) {
  return CACHE_KEYS.parentChild(studentId)
}

/**
 * Fetch parent children list with write-through cache.
 * @param {(url: string, init?: RequestInit) => Promise<Response>} fetcher
 */
export async function fetchParentChildrenWithCache(fetcher) {
  const cacheKey = parentChildrenCacheKey()
  if (isBrowserOnline()) {
    try {
      const res = await fetcher('/api/parent/children')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load children')
      const children = Array.isArray(json.children) ? json.children : []
      await cacheParentJson(cacheKey, children)
      return { children, fromCache: false }
    } catch (err) {
      if (!isNetworkFailure(err)) throw err
    }
  }
  const cached = await getCachedParentJson(cacheKey)
  if (Array.isArray(cached)) return { children: cached, fromCache: true }
  // Legacy seed key
  const legacy = await getCachedParentJson('seed:parent-children')
  if (Array.isArray(legacy) && legacy.length) {
    const mapped = legacy.map((s) => ({
      linkId: `seed:${s.id}`,
      relationship: null,
      student: {
        id: s.id,
        name: s.name,
        class: s.class,
        examNumber: s.exam_number,
      },
    }))
    return { children: mapped, fromCache: true }
  }
  throw new Error('No cached children available offline. Open the parent portal once while online.')
}

/**
 * Fetch aggregated child portal payload with write-through cache.
 * @param {string} studentId
 * @param {(url: string, init?: RequestInit) => Promise<Response>} fetcher
 */
export async function fetchParentChildWithCache(studentId, fetcher) {
  const id = String(studentId || '')
  if (!id) throw new Error('Student required')
  const cacheKey = parentChildCacheKey(id)
  if (isBrowserOnline()) {
    try {
      const res = await fetcher(`/api/parent/child?studentId=${encodeURIComponent(id)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      const data = json.data
      await cacheParentJson(cacheKey, data)
      return { data, fromCache: false }
    } catch (err) {
      if (!isNetworkFailure(err)) throw err
    }
  }
  const cached = await getCachedParentJson(cacheKey)
  if (cached) return { data: cached, fromCache: true }
  throw new Error('No cached child data available offline. Open this child once while online.')
}
