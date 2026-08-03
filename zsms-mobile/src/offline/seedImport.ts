/**
 * Import decrypted .zsmsseed payload into AsyncStorage caches (Expo).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CACHE_KEYS } from '@/offline/syncContracts'

const CACHE_PREFIX = 'zsms_seed_cache:'
const ROSTER_PREFIX = 'zsms_seed_roster:'
const META_KEY = 'zsms_seed_meta'

export type SeedPayload = {
  schoolId: string
  userId?: string
  role?: string
  exportedAt?: string
  expiresAt?: string
  data?: {
    caches?: Record<string, unknown>
    rosters?: Array<{ classId?: string; schoolId?: string; students?: unknown[] }>
  }
}

export type SeedMeta = {
  schoolId: string
  userId: string
  role: string
  importedAt: string
  exportedAt: string
  expiresAt: string
  cacheKeys: number
  rosters: number
}

export async function importSeedIntoMobileStore(payload: SeedPayload): Promise<SeedMeta> {
  if (!payload?.schoolId) throw new Error('Seed missing schoolId')
  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
    throw new Error('This seed pack has expired. Download a fresh one while online.')
  }

  const caches = payload.data?.caches || {}
  const keys = Object.keys(caches)
  for (const cacheKey of keys) {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({
        cacheKey,
        data: caches[cacheKey],
        cachedAt: new Date().toISOString(),
        fromSeed: true,
      })
    )
  }

  const rosters = Array.isArray(payload.data?.rosters) ? payload.data!.rosters! : []
  for (const roster of rosters) {
    if (!roster?.classId) continue
    await AsyncStorage.setItem(
      `${ROSTER_PREFIX}${roster.classId}`,
      JSON.stringify({
        classId: String(roster.classId),
        schoolId: String(roster.schoolId || payload.schoolId),
        students: Array.isArray(roster.students) ? roster.students : [],
        cachedAt: new Date().toISOString(),
        fromSeed: true,
      })
    )
  }

  const meta: SeedMeta = {
    schoolId: payload.schoolId,
    userId: String(payload.userId || ''),
    role: String(payload.role || ''),
    importedAt: new Date().toISOString(),
    exportedAt: String(payload.exportedAt || ''),
    expiresAt: String(payload.expiresAt || ''),
    cacheKeys: keys.length,
    rosters: rosters.length,
  }
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta))
  return meta
}

export async function getMobileSeedMeta(): Promise<SeedMeta | null> {
  const raw = await AsyncStorage.getItem(META_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SeedMeta
  } catch {
    return null
  }
}

export async function getMobileCachedJson<T = unknown>(cacheKey: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${cacheKey}`)
  if (!raw) return null
  try {
    const row = JSON.parse(raw) as { data?: T }
    return (row?.data ?? null) as T | null
  } catch {
    return null
  }
}

export async function getMobileRoster(classId: string) {
  const raw = await AsyncStorage.getItem(`${ROSTER_PREFIX}${classId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Convenience for teaching assignment caches after seed import */
export async function getSeedTeachingAssignments(userId: string) {
  return (
    (await getMobileCachedJson(CACHE_KEYS.teachingAssignments(userId))) ||
    (await getMobileCachedJson('seed:teaching-assignments'))
  )
}
