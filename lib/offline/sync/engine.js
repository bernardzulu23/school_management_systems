/**
 * Central offline sync engine — single-flight flush across channels.
 */
import { attendanceStore } from '@/lib/offline/attendance-store'
import { resultsStore } from '@/lib/offline/results-store'
import { getOfflineDB, pendingFilter } from '@/lib/offline/db'
import { emitOfflineSynced } from '@/lib/offline/events'
import { isBrowserOnline } from '@/lib/offline/network'

let flushing = false

/**
 * @param {{
 *   userId?: string,
 *   postGradebook?: (payload: object) => Promise<unknown>,
 *   channels?: Array<'attendance' | 'results' | 'mutations'>
 * }} [opts]
 */
export async function flushOfflineQueues(opts = {}) {
  if (flushing) return { synced: 0, failed: 0, skipped: true }
  if (!isBrowserOnline()) return { synced: 0, failed: 0, skipped: true }

  flushing = true
  const channels = opts.channels || ['attendance', 'results', 'mutations']
  let synced = 0
  let failed = 0
  /** @type {Record<string, { synced: number, failed: number }>} */
  const byChannel = {}

  try {
    if (channels.includes('attendance')) {
      const att = await attendanceStore.syncPending()
      byChannel.attendance = att
      synced += att.synced
      failed += att.failed
    }
    if (channels.includes('results')) {
      const res = await resultsStore.syncPending({
        userId: opts.userId,
        postGradebook: opts.postGradebook,
      })
      byChannel.results = { synced: res.synced, failed: res.failed }
      synced += res.synced
      failed += res.failed
    }
    if (channels.includes('mutations')) {
      const mut = await flushMutationQueue()
      byChannel.mutations = mut
      synced += mut.synced
      failed += mut.failed
    }

    const database = getOfflineDB()
    if (database && (synced || failed)) {
      await database.syncLog.add({
        syncedAt: new Date().toISOString(),
        count: synced,
        errors: failed,
        channel: 'engine',
      })
    }

    emitOfflineSynced({ synced, failed, byChannel })
    return { synced, failed, byChannel, skipped: false }
  } finally {
    flushing = false
  }
}

async function flushMutationQueue() {
  const database = getOfflineDB()
  if (!database) return { synced: 0, failed: 0 }

  const pending = await database.mutationQueue.filter(pendingFilter()).toArray()
  let synced = 0
  let failed = 0

  for (const row of pending) {
    try {
      const method = String(row.method || 'POST').toUpperCase()
      const url = String(row.url || '')
      if (!url) {
        await database.mutationQueue.update(row.id, {
          synced: true,
          dropped: true,
          lastError: 'missing url',
        })
        failed++
        continue
      }
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(row.headers || {}) },
        body: row.body != null ? JSON.stringify(row.body) : undefined,
      })
      if (response.ok) {
        await database.mutationQueue.update(row.id, {
          synced: true,
          syncedAt: new Date().toISOString(),
        })
        synced++
      } else if (response.status === 409) {
        await database.conflictQueue.add({
          channel: row.channel || 'mutation',
          entityKey: row.entityKey || String(row.id),
          createdAt: new Date().toISOString(),
          resolved: false,
          local: row,
          httpStatus: 409,
        })
        await database.mutationQueue.update(row.id, {
          synced: true,
          conflict: true,
          syncedAt: new Date().toISOString(),
        })
        failed++
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        await database.mutationQueue.update(row.id, {
          synced: true,
          dropped: true,
          lastError: `HTTP ${response.status}`,
        })
        failed++
      } else {
        await database.mutationQueue.update(row.id, {
          retryCount: (row.retryCount || 0) + 1,
          lastError: `HTTP ${response.status}`,
        })
        failed++
      }
    } catch (e) {
      await database.mutationQueue.update(row.id, {
        retryCount: (row.retryCount || 0) + 1,
        lastError: e?.message || 'Network error',
      })
      failed++
    }
  }

  return { synced, failed }
}

/**
 * Enqueue a generic mutation for later sync (Phase 2+ features).
 * Replaces any pending row with the same channel + entityKey.
 * @param {{ channel: string, entityKey?: string, url: string, method?: string, body?: unknown, headers?: Record<string, string> }} op
 */
export async function enqueueMutation(op) {
  const database = getOfflineDB()
  if (!database || !op?.url) return null
  const channel = String(op.channel || 'mutation')
  const entityKey = String(op.entityKey || '')

  if (entityKey) {
    const existing = await database.mutationQueue
      .filter(
        (row) =>
          pendingFilter()(row) &&
          String(row.channel || '') === channel &&
          String(row.entityKey || '') === entityKey
      )
      .toArray()
    for (const row of existing) {
      await database.mutationQueue.delete(row.id)
    }
  }

  const id = await database.mutationQueue.add({
    channel,
    entityKey,
    url: String(op.url),
    method: String(op.method || 'POST'),
    body: op.body ?? null,
    headers: op.headers || {},
    queuedAt: new Date().toISOString(),
    synced: false,
    retryCount: 0,
  })
  const { emitOfflineQueue } = await import('@/lib/offline/events')
  emitOfflineQueue()
  return id
}

export async function getAllPendingCount(userId = '') {
  const att = await attendanceStore.getPendingCount()
  const res = await resultsStore.getPendingCount(userId)
  const database = getOfflineDB()
  const mut = database ? await database.mutationQueue.filter(pendingFilter()).count() : 0
  const conflicts = database
    ? await database.conflictQueue.filter((r) => r.resolved !== true).count()
    : 0
  return { attendance: att, results: res, mutations: mut, conflicts, total: att + res + mut }
}
