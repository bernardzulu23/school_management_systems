/**
 * Offline attendance store using Dexie (IndexedDB).
 *
 * Web teachers mark class attendance via POST /api/attendance (date + records).
 * Marks are queued locally first, then synced when online.
 *
 * @example
 * import { attendanceStore } from '@/lib/offline/attendance-store'
 * await attendanceStore.queueMark({ studentId, classId, schoolId, date, status: 'present' })
 * await attendanceStore.syncPending()
 */
import Dexie from 'dexie'

let db = null

function getDB() {
  if (typeof window === 'undefined') return null
  if (db) return db

  db = new Dexie('zsms_offline')

  db.version(1).stores({
    attendanceQueue: '++id, sessionId, studentId, schoolId, classId, date, markedAt, synced',
    classRosters: 'classId, schoolId, cachedAt',
    syncLog: '++id, syncedAt, count, errors',
  })

  return db
}

function pendingFilter() {
  return (mark) => mark.synced !== true && mark.synced !== 1
}

/**
 * Group pending marks by class + date for bulk API sync.
 * @param {Array<Record<string, unknown>>} marks
 */
export function groupMarksForSync(marks) {
  const groups = new Map()
  for (const mark of marks) {
    const classId = String(mark.classId || '')
    const date = String(mark.date || '')
    if (!classId || !date || !mark.studentId) continue
    const key = `${classId}|${date}`
    if (!groups.has(key)) {
      groups.set(key, { classId, date, schoolId: mark.schoolId, marks: [] })
    }
    groups.get(key).marks.push(mark)
  }
  return groups
}

export const attendanceStore = {
  /**
   * Queue one attendance mark (present / absent / late / excused).
   * Replaces any existing unsynced mark for the same student + class + date.
   *
   * @param {object} mark
   * @param {string} mark.studentId
   * @param {string} mark.classId
   * @param {string} [mark.schoolId]
   * @param {string} mark.date — YYYY-MM-DD
   * @param {string} [mark.status]
   * @param {string} [mark.sessionId]
   */
  async queueMark(mark) {
    const database = getDB()
    if (!database) return null

    const studentId = String(mark.studentId || '')
    const classId = String(mark.classId || '')
    const date = String(mark.date || '')
    if (!studentId || !classId || !date) return null

    const existing = await database.attendanceQueue
      .filter((row) => {
        return (
          pendingFilter()(row) &&
          String(row.studentId) === studentId &&
          String(row.classId) === classId &&
          String(row.date) === date
        )
      })
      .toArray()

    for (const row of existing) {
      await database.attendanceQueue.delete(row.id)
    }

    return database.attendanceQueue.add({
      studentId,
      classId,
      date,
      schoolId: mark.schoolId ? String(mark.schoolId) : '',
      sessionId: mark.sessionId ? String(mark.sessionId) : '',
      status: String(mark.status || 'present').toLowerCase(),
      markedAt: mark.markedAt || new Date().toISOString(),
      synced: false,
      retryCount: 0,
    })
  },

  /**
   * Queue a full class save (bulk) — one row per student.
   * @param {{ classId: string, schoolId?: string, date: string, records: Array<{ studentId: string, status: string }> }} payload
   */
  async queueBulk(payload) {
    const classId = String(payload.classId || '')
    const date = String(payload.date || '')
    const schoolId = payload.schoolId ? String(payload.schoolId) : ''
    const records = Array.isArray(payload.records) ? payload.records : []
    const ids = []
    for (const r of records) {
      const id = await this.queueMark({
        studentId: r.studentId,
        classId,
        schoolId,
        date,
        status: r.status,
      })
      if (id != null) ids.push(id)
    }
    return ids
  },

  async getPendingMarks() {
    const database = getDB()
    if (!database) return []
    return database.attendanceQueue.filter(pendingFilter()).toArray()
  },

  async markSynced(id) {
    const database = getDB()
    if (!database) return
    await database.attendanceQueue.update(id, {
      synced: true,
      syncedAt: new Date().toISOString(),
    })
  },

  /**
   * Sync pending marks to POST /api/attendance (grouped by class + date).
   * @returns {Promise<{ synced: number, failed: number }>}
   */
  async syncPending() {
    const database = getDB()
    if (!database || typeof navigator === 'undefined' || !navigator.onLine) {
      return { synced: 0, failed: 0 }
    }

    const pending = await this.getPendingMarks()
    if (pending.length === 0) return { synced: 0, failed: 0 }

    const groups = groupMarksForSync(pending)
    let synced = 0
    let failed = 0

    for (const { date, marks } of groups.values()) {
      const records = marks.map((m) => ({
        studentId: m.studentId,
        status: m.status || 'present',
        date: m.date,
      }))

      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date,
            records,
            source: 'offline-sync',
          }),
        })

        if (response.ok) {
          for (const m of marks) {
            await this.markSynced(m.id)
            synced++
          }
        } else {
          for (const m of marks) {
            await database.attendanceQueue.update(m.id, {
              retryCount: (m.retryCount || 0) + 1,
              lastError: `HTTP ${response.status}`,
            })
          }
          failed += marks.length
        }
      } catch (e) {
        for (const m of marks) {
          await database.attendanceQueue.update(m.id, {
            retryCount: (m.retryCount || 0) + 1,
            lastError: e?.message || 'Network error',
          })
        }
        failed += marks.length
      }
    }

    await database.syncLog.add({
      syncedAt: new Date().toISOString(),
      count: synced,
      errors: failed,
    })

    return { synced, failed }
  },

  async cacheRoster(classId, schoolId, students) {
    const database = getDB()
    if (!database || !classId) return

    await database.classRosters.put({
      classId: String(classId),
      schoolId: schoolId ? String(schoolId) : '',
      students: Array.isArray(students) ? students : [],
      cachedAt: new Date().toISOString(),
    })
  },

  async getCachedRoster(classId) {
    const database = getDB()
    if (!database) return null
    return database.classRosters.get(String(classId))
  },

  async getPendingCount() {
    const database = getDB()
    if (!database) return 0
    return database.attendanceQueue.filter(pendingFilter()).count()
  },

  /** Clear synced rows older than 7 days (optional housekeeping). */
  async pruneSynced(olderThanDays = 7) {
    const database = getDB()
    if (!database) return 0
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    const old = await database.attendanceQueue
      .filter((m) => m.synced === true && m.syncedAt && new Date(m.syncedAt).getTime() < cutoff)
      .toArray()
    for (const row of old) {
      await database.attendanceQueue.delete(row.id)
    }
    return old.length
  },
}
