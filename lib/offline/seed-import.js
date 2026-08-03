/**
 * Apply a decrypted seed pack into IndexedDB caches (browser only).
 */
import { getOfflineDB } from '@/lib/offline/db'
import { emitOfflineSeed } from '@/lib/offline/events'

/**
 * @param {object} payload — decrypted seed body from API
 */
export async function importSeedIntoOfflineStore(payload) {
  const database = getOfflineDB()
  if (!database) throw new Error('IndexedDB unavailable')
  if (!payload?.schoolId) throw new Error('Seed missing schoolId')

  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
    throw new Error('This seed pack has expired. Download a fresh one while online.')
  }

  const caches = payload.data?.caches || {}
  for (const [cacheKey, data] of Object.entries(caches)) {
    await database.resultsCache.put({
      cacheKey: String(cacheKey),
      data,
      cachedAt: new Date().toISOString(),
      fromSeed: true,
    })
  }

  const rosters = Array.isArray(payload.data?.rosters) ? payload.data.rosters : []
  for (const roster of rosters) {
    if (!roster?.classId) continue
    await database.classRosters.put({
      classId: String(roster.classId),
      schoolId: String(roster.schoolId || payload.schoolId),
      students: Array.isArray(roster.students) ? roster.students : [],
      cachedAt: new Date().toISOString(),
      fromSeed: true,
    })
  }

  await database.seedMeta.put({
    id: 'last',
    schoolId: payload.schoolId,
    userId: payload.userId || '',
    role: payload.role || '',
    importedAt: new Date().toISOString(),
    exportedAt: payload.exportedAt || '',
    expiresAt: payload.expiresAt || '',
  })

  emitOfflineSeed({ schoolId: payload.schoolId, role: payload.role })
  return {
    cacheKeys: Object.keys(caches).length,
    rosters: rosters.length,
  }
}

export async function getSeedMeta() {
  const database = getOfflineDB()
  if (!database) return null
  return database.seedMeta.get('last')
}
