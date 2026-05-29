import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadLessonPlan, loadLessonPlans } from '@/api/lessonPlans'
import type { LessonPlanDetail, LessonPlanSummary } from '@/types'

const LIST_KEY = 'zsms_lesson_plans_cache'
const DETAIL_PREFIX = 'zsms_lesson_plan_'
const META_KEY = 'zsms_lesson_plans_cached_at'

interface LessonPlanCacheState {
  plans: LessonPlanSummary[]
  details: Record<string, LessonPlanDetail>
  cachedAt: number | null
  loading: boolean
  fromCache: boolean
  error: string | null
  hydrate: () => Promise<void>
  refresh: () => Promise<void>
  getDetail: (id: string) => Promise<LessonPlanDetail>
}

export const useLessonPlanCache = create<LessonPlanCacheState>((set, get) => ({
  plans: [],
  details: {},
  cachedAt: null,
  loading: false,
  fromCache: false,
  error: null,

  hydrate: async () => {
    try {
      const [rawList, rawMeta] = await Promise.all([
        AsyncStorage.getItem(LIST_KEY),
        AsyncStorage.getItem(META_KEY),
      ])
      if (rawList) {
        set({
          plans: JSON.parse(rawList) as LessonPlanSummary[],
          cachedAt: rawMeta ? Number(rawMeta) : null,
          fromCache: true,
        })
      }
    } catch {
      // ignore cache read errors
    }
  },

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const plans = await loadLessonPlans()
      const now = Date.now()
      set({ plans, cachedAt: now, fromCache: false, loading: false })
      await AsyncStorage.setItem(LIST_KEY, JSON.stringify(plans))
      await AsyncStorage.setItem(META_KEY, String(now))
    } catch (e) {
      // Offline / failed: fall back to cached data (already hydrated).
      await get().hydrate()
      set({
        loading: false,
        fromCache: true,
        error: e instanceof Error ? e.message : 'Could not refresh — showing cached plans',
      })
    }
  },

  getDetail: async (id: string) => {
    try {
      const detail = await loadLessonPlan(id)
      set((s) => ({ details: { ...s.details, [id]: detail } }))
      await AsyncStorage.setItem(DETAIL_PREFIX + id, JSON.stringify(detail))
      return detail
    } catch (e) {
      const cached = get().details[id]
      if (cached) return cached
      const raw = await AsyncStorage.getItem(DETAIL_PREFIX + id)
      if (raw) {
        const parsed = JSON.parse(raw) as LessonPlanDetail
        set((s) => ({ details: { ...s.details, [id]: parsed } }))
        return parsed
      }
      throw e instanceof Error ? e : new Error('Lesson plan unavailable offline')
    }
  },
}))
