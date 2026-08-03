/**
 * Phase 4 admin / HT / HOD offline helpers (timetable drafts, notice drafts, report cache).
 */
import { enqueueMutation } from '@/lib/offline/sync/engine'
import { getOfflineDB } from '@/lib/offline/db'
import { resultsStore } from '@/lib/offline/results-store'
import { isBrowserOnline, isNetworkFailure } from '@/lib/offline/network'

export const TIMETABLE_CHANNEL = 'timetable-draft'

/**
 * @param {object} body — POST /api/timetable/entries/sync-draft
 */
export async function queueTimetableSyncDraft(body) {
  const term = String(body?.term || '')
  const academicYear = String(body?.academicYear || '')
  if (!term || !academicYear) return null
  return enqueueMutation({
    channel: TIMETABLE_CHANNEL,
    entityKey: `sync:${term}:${academicYear}`,
    url: '/api/timetable/entries/sync-draft',
    method: 'POST',
    body,
  })
}

/**
 * @param {object} body — PATCH /api/timetable/entries
 */
export async function queueTimetablePatch(body) {
  const id = String(body?.id || '')
  if (!id) return null
  return enqueueMutation({
    channel: TIMETABLE_CHANNEL,
    entityKey: `patch:${id}`,
    url: '/api/timetable/entries',
    method: 'PATCH',
    body,
  })
}

/**
 * @param {object} body — DELETE /api/timetable/entries
 */
export async function queueTimetableDelete(body) {
  if (body?.clearAll) {
    const term = String(body.term || '')
    const academicYear = String(body.academicYear || '')
    if (!term || !academicYear) return null
    return enqueueMutation({
      channel: TIMETABLE_CHANNEL,
      entityKey: `clear:${term}:${academicYear}`,
      url: '/api/timetable/entries',
      method: 'DELETE',
      body,
    })
  }
  const id = String(body?.id || '')
  if (!id) return null
  return enqueueMutation({
    channel: TIMETABLE_CHANNEL,
    entityKey: `delete:${id}`,
    url: '/api/timetable/entries',
    method: 'DELETE',
    body,
  })
}

/**
 * @param {object} body — PATCH /api/timetable/draft-meta
 */
export async function queueDraftMetaPatch(body) {
  const term = String(body?.term || '')
  const academicYear = String(body?.academicYear || '')
  if (!term || !academicYear) return null
  const keyPart =
    body?.auditKey ||
    (Array.isArray(body?.auditKeys) ? body.auditKeys.join(',') : '') ||
    body?.mode ||
    'meta'
  return enqueueMutation({
    channel: TIMETABLE_CHANNEL,
    entityKey: `meta:${term}:${academicYear}:${keyPart}:${body?.mode || 'add'}`,
    url: '/api/timetable/draft-meta',
    method: 'PATCH',
    body,
  })
}

/**
 * Try a network write; on offline/network failure run `queueFn`.
 * @template T
 * @param {() => Promise<T>} onlineFn
 * @param {() => Promise<unknown>} queueFn
 * @returns {Promise<{ ok: true, offline?: boolean, data?: T } | { ok: false, error: Error }>}
 */
export async function tryOnlineOrQueue(onlineFn, queueFn) {
  if (!isBrowserOnline()) {
    await queueFn()
    return { ok: true, offline: true }
  }
  try {
    const data = await onlineFn()
    return { ok: true, offline: false, data }
  } catch (err) {
    if (isNetworkFailure(err)) {
      await queueFn()
      return { ok: true, offline: true }
    }
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

export async function cacheAdminJson(key, data) {
  return resultsStore.cacheJson(key, data)
}

export async function getCachedAdminJson(key) {
  return resultsStore.getCachedJson(key)
}

export function newAnnouncementDraftId() {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `t${Date.now()}`
  return `local:${uuid}`
}

/**
 * Device-local notice drafts (not synced — announcements API is stubbed).
 * @param {{ title: string, body: string, audience?: string }} draft
 */
export async function saveAnnouncementDraft(draft) {
  const database = getOfflineDB()
  if (!database || !draft?.title) return null
  const id = draft.id || newAnnouncementDraftId()
  const now = new Date().toISOString()
  const row = {
    id,
    title: String(draft.title).trim(),
    body: String(draft.body || '').trim(),
    audience: String(draft.audience || 'all'),
    status: draft.status || 'draft',
    createdAt: draft.createdAt || now,
    updatedAt: now,
  }
  await database.announcementDrafts.put(row)
  return row
}

export async function listAnnouncementDrafts() {
  const database = getOfflineDB()
  if (!database) return []
  const rows = await database.announcementDrafts.orderBy('updatedAt').reverse().toArray()
  return rows
}

export async function deleteAnnouncementDraft(id) {
  const database = getOfflineDB()
  if (!database || !id) return false
  await database.announcementDrafts.delete(String(id))
  return true
}

/**
 * Fetch JSON GET with write-through IndexedDB cache for HT/HOD reports.
 * @param {string} url
 * @param {string} cacheKey
 * @param {(init?: RequestInit) => Promise<Response>} [fetcher]
 */
export async function fetchJsonWithAdminCache(url, cacheKey, fetcher = fetch) {
  if (isBrowserOnline()) {
    try {
      const res = await fetcher(url, { credentials: 'include', cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`)
      const data = json.data !== undefined ? json : json
      await cacheAdminJson(cacheKey, data)
      return { data, fromCache: false }
    } catch (err) {
      if (!isNetworkFailure(err)) throw err
    }
  }
  const cached = await getCachedAdminJson(cacheKey)
  if (cached != null) return { data: cached, fromCache: true }
  throw new Error('No cached report available offline. Open this page once while online.')
}
