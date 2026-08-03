/**
 * Shared Dexie (IndexedDB) database for rural / offline workflows.
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

  db.version(2).stores({
    attendanceQueue: '++id, sessionId, studentId, schoolId, classId, date, markedAt, synced',
    classRosters: 'classId, schoolId, cachedAt',
    syncLog: '++id, syncedAt, count, errors',
    sbaScoreQueue: '++id, assessmentId, studentId, taskNumber, academicYear, synced, queuedAt',
    gradebookQueue: '++id, userId, synced, createdAt',
    resultsCache: 'cacheKey, cachedAt',
  })

  // Platform Phase 1: generic mutations, conflicts, seed metadata
  db.version(3).stores({
    attendanceQueue: '++id, sessionId, studentId, schoolId, classId, date, markedAt, synced',
    classRosters: 'classId, schoolId, cachedAt',
    syncLog: '++id, syncedAt, count, errors',
    sbaScoreQueue: '++id, assessmentId, studentId, taskNumber, academicYear, synced, queuedAt',
    gradebookQueue: '++id, userId, synced, createdAt',
    resultsCache: 'cacheKey, cachedAt',
    mutationQueue: '++id, channel, entityKey, synced, queuedAt',
    conflictQueue: '++id, channel, entityKey, createdAt, resolved',
    seedMeta: 'id, importedAt, exportedAt, role, schoolId',
  })

  // Phase 4: local announcement / school notice drafts (device-only until a server model exists)
  db.version(4).stores({
    attendanceQueue: '++id, sessionId, studentId, schoolId, classId, date, markedAt, synced',
    classRosters: 'classId, schoolId, cachedAt',
    syncLog: '++id, syncedAt, count, errors',
    sbaScoreQueue: '++id, assessmentId, studentId, taskNumber, academicYear, synced, queuedAt',
    gradebookQueue: '++id, userId, synced, createdAt',
    resultsCache: 'cacheKey, cachedAt',
    mutationQueue: '++id, channel, entityKey, synced, queuedAt',
    conflictQueue: '++id, channel, entityKey, createdAt, resolved',
    seedMeta: 'id, importedAt, exportedAt, role, schoolId',
    announcementDrafts: 'id, updatedAt, status',
  })

  return db
}

export function pendingFilter() {
  return (row) => row.synced !== true && row.synced !== 1
}

/** @deprecated use getOfflineDB — kept for clarity in call sites */
export function resetOfflineDbForTests() {
  db = null
}
