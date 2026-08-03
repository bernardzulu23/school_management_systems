/**
 * Shared Dexie (IndexedDB) database for rural / offline teacher workflows.
 * Database name: zsms_offline
 */
import Dexie from 'dexie'

/** @type {import('dexie').Dexie | null} */
let db = null

export function getOfflineDB() {
  if (typeof window === 'undefined') return null
  if (db) return db

  db = new Dexie('zsms_offline')

  db.version(1).stores({
    attendanceQueue: '++id, sessionId, studentId, schoolId, classId, date, markedAt, synced',
    classRosters: 'classId, schoolId, cachedAt',
    syncLog: '++id, syncedAt, count, errors',
  })

  // Teacher results: SBA scores + secondary gradebook queue + small JSON caches
  db.version(2).stores({
    attendanceQueue: '++id, sessionId, studentId, schoolId, classId, date, markedAt, synced',
    classRosters: 'classId, schoolId, cachedAt',
    syncLog: '++id, syncedAt, count, errors',
    sbaScoreQueue: '++id, assessmentId, studentId, taskNumber, academicYear, synced, queuedAt',
    gradebookQueue: '++id, userId, synced, createdAt',
    resultsCache: 'cacheKey, cachedAt',
  })

  return db
}

export function pendingFilter() {
  return (row) => row.synced !== true && row.synced !== 1
}
