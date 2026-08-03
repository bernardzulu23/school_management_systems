/**
 * Offline queues for teacher results entry (ECZ SBA + secondary gradebook).
 *
 * @example
 * await resultsStore.queueSbaScore({ assessmentId, studentId, formLevel, ... })
 * await resultsStore.queueGradebook({ userId, payload })
 * await resultsStore.syncPending()
 */
import { getOfflineDB, pendingFilter } from '@/lib/offline/db'

const GRADEBOOK_KEEP_MS = 8 * 24 * 60 * 60 * 1000
const LEGACY_GRADEBOOK_PREFIX = 'gradebook_queue_v1'

function isNetworkFailure(err) {
  if (!err) return false
  const name = String(err.name || '')
  const msg = String(err.message || err).toLowerCase()
  return (
    name === 'TypeError' ||
    name === 'AbortError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  )
}

export const resultsStore = {
  isNetworkFailure,

  /**
   * Queue one SBA score POST body. Replaces pending row for same learner+assessment+task+year.
   * @param {Record<string, unknown>} body — same shape as POST /api/assessments/sba-scores
   */
  async queueSbaScore(body) {
    const database = getOfflineDB()
    if (!database || !body) return null

    const assessmentId = String(body.assessmentId || '')
    const studentId = String(body.studentId || body.learnerId || '')
    const taskNumber = Number(body.taskNumber) || 1
    const academicYear = Number(body.academicYear) || new Date().getFullYear()
    if (!assessmentId || !studentId) return null

    const existing = await database.sbaScoreQueue
      .filter(
        (row) =>
          pendingFilter()(row) &&
          String(row.assessmentId) === assessmentId &&
          String(row.studentId) === studentId &&
          Number(row.taskNumber) === taskNumber &&
          Number(row.academicYear) === academicYear
      )
      .toArray()

    for (const row of existing) {
      await database.sbaScoreQueue.delete(row.id)
    }

    return database.sbaScoreQueue
      .add({
        assessmentId,
        studentId,
        taskNumber,
        academicYear,
        body: { ...body, assessmentId, studentId, taskNumber, academicYear },
        queuedAt: new Date().toISOString(),
        synced: false,
        retryCount: 0,
      })
      .then((id) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zsms-offline-queue'))
        }
        return id
      })
  },

  async getPendingSbaScores() {
    const database = getOfflineDB()
    if (!database) return []
    return database.sbaScoreQueue.filter(pendingFilter()).toArray()
  },

  /**
   * Queue a gradebook POST payload (may be batched later on sync).
   * @param {{ userId?: string, payload: object }} item
   */
  async queueGradebook({ userId = '', payload }) {
    const database = getOfflineDB()
    if (!database || !payload) return null
    return database.gradebookQueue
      .add({
        userId: String(userId || ''),
        payload,
        createdAt: new Date().toISOString(),
        synced: false,
        retryCount: 0,
      })
      .then((id) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zsms-offline-queue'))
        }
        return id
      })
  },

  async getPendingGradebook(userId) {
    const database = getOfflineDB()
    if (!database) return []
    const uid = String(userId || '')
    const rows = await database.gradebookQueue.filter(pendingFilter()).toArray()
    const cutoff = Date.now() - GRADEBOOK_KEEP_MS
    const kept = []
    for (const row of rows) {
      if (uid && row.userId && String(row.userId) !== uid) continue
      const created = row.createdAt ? new Date(row.createdAt).getTime() : Date.now()
      if (created < cutoff) {
        await database.gradebookQueue.delete(row.id)
        continue
      }
      kept.push(row)
    }
    return kept
  },

  /**
   * One-time migration from localStorage gradebook_queue_v1* into IndexedDB.
   * @param {string} [userId]
   */
  async migrateLegacyGradebookQueue(userId = '') {
    if (typeof localStorage === 'undefined') return 0
    const database = getOfflineDB()
    if (!database) return 0

    const keys = []
    const exact = userId ? `${LEGACY_GRADEBOOK_PREFIX}:${userId}` : LEGACY_GRADEBOOK_PREFIX
    keys.push(exact)
    if (userId) keys.push(LEGACY_GRADEBOOK_PREFIX)

    let migrated = 0
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed) || !parsed.length) {
          localStorage.removeItem(key)
          continue
        }
        for (const item of parsed) {
          if (!item?.payload) continue
          await this.queueGradebook({
            userId: userId || item.userId || '',
            payload: item.payload,
          })
          migrated++
        }
        localStorage.removeItem(key)
      } catch {
        /* keep legacy key if corrupt */
      }
    }
    return migrated
  },

  async cacheJson(cacheKey, data) {
    const database = getOfflineDB()
    if (!database || !cacheKey) return
    await database.resultsCache.put({
      cacheKey: String(cacheKey),
      data,
      cachedAt: new Date().toISOString(),
    })
  },

  async getCachedJson(cacheKey) {
    const database = getOfflineDB()
    if (!database || !cacheKey) return null
    const row = await database.resultsCache.get(String(cacheKey))
    return row?.data ?? null
  },

  async getPendingCount(userId) {
    const database = getOfflineDB()
    if (!database) return 0
    const sba = await database.sbaScoreQueue.filter(pendingFilter()).count()
    const gb = await this.getPendingGradebook(userId)
    return sba + gb.length
  },

  async syncSbaPending() {
    const database = getOfflineDB()
    if (!database || typeof navigator === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 }
    }

    const pending = await this.getPendingSbaScores()
    let synced = 0
    let failed = 0

    for (const row of pending) {
      try {
        const response = await fetch('/api/assessments/sba-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...row.body, source: 'offline-sync' }),
        })
        if (response.ok) {
          await database.sbaScoreQueue.update(row.id, {
            synced: true,
            syncedAt: new Date().toISOString(),
          })
          synced++
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          // Permanent client error — drop so teachers are not stuck retrying bad rows
          await database.sbaScoreQueue.update(row.id, {
            synced: true,
            syncedAt: new Date().toISOString(),
            dropped: true,
            lastError: `HTTP ${response.status}`,
          })
          failed++
        } else {
          await database.sbaScoreQueue.update(row.id, {
            retryCount: (row.retryCount || 0) + 1,
            lastError: `HTTP ${response.status}`,
          })
          failed++
        }
      } catch (e) {
        await database.sbaScoreQueue.update(row.id, {
          retryCount: (row.retryCount || 0) + 1,
          lastError: e?.message || 'Network error',
        })
        failed++
      }
    }

    return { synced, failed }
  },

  /**
   * @param {{ userId?: string, postPayload: (payload: object) => Promise<unknown> }} opts
   */
  async syncGradebookPending({ userId = '', postPayload }) {
    const database = getOfflineDB()
    if (!database || typeof navigator === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 }
    }
    if (typeof postPayload !== 'function') return { synced: 0, failed: 0 }

    const pending = await this.getPendingGradebook(userId)
    let synced = 0
    let failed = 0

    for (const row of pending) {
      try {
        await postPayload(row.payload)
        await database.gradebookQueue.update(row.id, {
          synced: true,
          syncedAt: new Date().toISOString(),
        })
        synced++
      } catch (e) {
        const msg = String(e?.message || '')
        if (msg === 'conflicts') {
          // Leave in queue; UI surfaces conflict resolver
          failed++
          break
        }
        await database.gradebookQueue.update(row.id, {
          retryCount: (row.retryCount || 0) + 1,
          lastError: msg || 'Sync failed',
        })
        failed++
        if (isNetworkFailure(e)) break
      }
    }

    return { synced, failed }
  },

  /**
   * Sync SBA queue (+ optional gradebook via postPayload).
   * @param {{ userId?: string, postGradebook?: (payload: object) => Promise<unknown> }} [opts]
   */
  async syncPending(opts = {}) {
    const database = getOfflineDB()
    const sba = await this.syncSbaPending()
    let gradebook = { synced: 0, failed: 0 }
    if (opts.postGradebook) {
      gradebook = await this.syncGradebookPending({
        userId: opts.userId,
        postPayload: opts.postGradebook,
      })
    }
    const synced = sba.synced + gradebook.synced
    const failed = sba.failed + gradebook.failed
    if (database && (synced || failed)) {
      await database.syncLog.add({
        syncedAt: new Date().toISOString(),
        count: synced,
        errors: failed,
        channel: 'results',
      })
    }
    return { synced, failed, sba, gradebook }
  },
}
