import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Assignment, Conflict, TravelingTeacherRoute } from './types'
import { CollisionDetector } from './collisionDetector'
import { SuggestionEngine, type Suggestion } from './suggestionEngine'

export type TimetableVersion = 'normal' | 'farming' | 'emergency'
export type TimetableSeasonMode = 'normal' | 'planting' | 'harvest'

export type ChangeKind = 'add' | 'remove' | 'update' | 'publish' | 'generate' | 'optimize' | 'route'

export interface Change {
  id: string
  kind: ChangeKind
  at: string
  assignmentId?: Assignment['id']
  before?: Assignment | null
  after?: Assignment | null
  meta?: Record<string, unknown>
}

export interface TimetableSnapshot {
  at: string
  assignments: Assignment[]
  conflicts: Array<[string, Conflict[]]>
  timetableVersion: TimetableVersion
  isPublished: boolean
  lastPublishedAt: string | null
  pendingChanges: Change[]
  currentSeason: TimetableSeasonMode
  travelingTeacherRoutes: TravelingTeacherRoute[]
}

export interface TimetableStoreState {
  assignments: Assignment[]
  conflicts: Map<string, Conflict[]>
  timetableVersion: TimetableVersion
  isPublished: boolean
  lastPublishedAt: Date | null
  pendingChanges: Change[]
  undoStack: TimetableSnapshot[]
  redoStack: TimetableSnapshot[]
  currentSeason: TimetableSeasonMode
  travelingTeacherRoutes: TravelingTeacherRoute[]

  addAssignment: (assignment: Assignment) => void
  replaceAssignments: (assignments: Assignment[], meta?: { source?: ChangeKind }) => void
  removeAssignment: (assignmentId: Assignment['id']) => void
  updateAssignment: (assignmentId: Assignment['id'], patch: Partial<Assignment>) => void
  detectConflicts: (opts?: {
    assignments?: Assignment[]
    whatIf?: boolean
  }) => Map<string, Conflict[]>
  suggestResolutions: (assignmentId: Assignment['id']) => Suggestion[]
  undo: () => void
  redo: () => void
  publish: () => void
  generateFromScratch: (opts?: {
    seed?: number
    version?: TimetableVersion
    season?: TimetableSeasonMode
  }) => void
  switchSeason: (season: TimetableSeasonMode) => void
  addTravelingTeacherRoute: (route: TravelingTeacherRoute) => void
  optimizeWorkload: () => void
  loadFromApi: (opts?: { term?: string; academicYear?: string; status?: string }) => Promise<void>

  getConflictCount: () => number
  getAssignmentsByTeacher: (teacherId: Assignment['teacherId']) => Assignment[]
  getAssignmentsByClass: (classId: Assignment['classId']) => Assignment[]
  getAssignmentsByDay: (dayOfWeek: Assignment['dayOfWeek']) => Assignment[]
  isTeacherAvailable: (
    teacherId: Assignment['teacherId'],
    dayOfWeek: Assignment['dayOfWeek'],
    startTime: Assignment['startTime'],
    endTime: Assignment['endTime']
  ) => boolean
  getTeacherWorkload: (teacherId: Assignment['teacherId']) => {
    totalPeriods: number
    byDay: Partial<Record<Assignment['dayOfWeek'], number>>
  }
}

function nowIso() {
  return new Date().toISOString()
}

function genId() {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeAssignments(value: unknown): Assignment[] {
  return safeArray<Assignment>(value).filter(Boolean)
}

function normalizeRouteList(value: unknown): TravelingTeacherRoute[] {
  return safeArray<TravelingTeacherRoute>(value).filter(Boolean)
}

function serializeConflicts(map: Map<string, Conflict[]>): Array<[string, Conflict[]]> {
  return Array.from(map.entries())
}

function deserializeConflicts(entries: unknown): Map<string, Conflict[]> {
  const out = new Map<string, Conflict[]>()
  for (const item of safeArray<[string, Conflict[]]>(entries)) {
    if (!Array.isArray(item) || item.length !== 2) continue
    const key = String(item[0])
    const val = safeArray<Conflict>(item[1])
    out.set(key, val)
  }
  return out
}

function snapshotFrom(state: TimetableStoreState): TimetableSnapshot {
  return {
    at: nowIso(),
    assignments: [...state.assignments],
    conflicts: serializeConflicts(state.conflicts).map(([k, v]) => [k, [...v]]),
    timetableVersion: state.timetableVersion,
    isPublished: state.isPublished,
    lastPublishedAt: state.lastPublishedAt ? state.lastPublishedAt.toISOString() : null,
    pendingChanges: [...state.pendingChanges],
    currentSeason: state.currentSeason,
    travelingTeacherRoutes: [...state.travelingTeacherRoutes],
  }
}

function applyUndoRedo(
  set: (fn: (s: TimetableStoreState) => Partial<TimetableStoreState>) => void
) {
  const pushSnapshot = () => {
    set((s) => {
      const nextUndo = [snapshotFrom(s), ...s.undoStack].slice(0, 50)
      return { undoStack: nextUndo, redoStack: [] }
    })
  }
  return { pushSnapshot }
}

export const useTimetableStore = create<TimetableStoreState>()(
  persist(
    (set, get) => {
      const { pushSnapshot } = applyUndoRedo(set)

      const detect = (assignments: Assignment[]) => {
        try {
          const detector = new CollisionDetector({
            assignments,
            travelingTeacherRoutes: get().travelingTeacherRoutes,
            seasonMode: get().currentSeason,
          })
          return detector.detectAllConflicts()
        } catch {
          return new Map<string, Conflict[]>()
        }
      }

      const trackChange = (change: Change) => {
        set((s) => ({ pendingChanges: [change, ...s.pendingChanges].slice(0, 500) }))
      }

      return {
        assignments: [],
        conflicts: new Map(),
        timetableVersion: 'normal',
        isPublished: false,
        lastPublishedAt: null,
        pendingChanges: [],
        undoStack: [],
        redoStack: [],
        currentSeason: 'normal',
        travelingTeacherRoutes: [],

        addAssignment: (assignment) => {
          if (!assignment || !assignment.id) return
          pushSnapshot()
          set((s) => {
            const next = [...s.assignments.filter((a) => a.id !== assignment.id), assignment]
            return { assignments: next, conflicts: detect(next), isPublished: false }
          })
          trackChange({
            id: genId(),
            kind: 'add',
            at: nowIso(),
            assignmentId: assignment.id,
            before: null,
            after: assignment,
          })
        },

        replaceAssignments: (assignments, meta) => {
          const next = normalizeAssignments(assignments)
          pushSnapshot()
          set(() => ({
            assignments: next,
            conflicts: detect(next),
            isPublished: false,
          }))
          trackChange({
            id: genId(),
            kind: meta?.source || 'generate',
            at: nowIso(),
            meta: { count: next.length },
          })
        },

        removeAssignment: (assignmentId) => {
          if (!assignmentId) return
          const before = get().assignments.find((a) => a.id === assignmentId) || null
          if (!before) return
          pushSnapshot()
          set((s) => {
            const next = s.assignments.filter((a) => a.id !== assignmentId)
            return { assignments: next, conflicts: detect(next), isPublished: false }
          })
          trackChange({
            id: genId(),
            kind: 'remove',
            at: nowIso(),
            assignmentId,
            before,
            after: null,
          })
        },

        updateAssignment: (assignmentId, patch) => {
          if (!assignmentId || !patch) return
          const before = get().assignments.find((a) => a.id === assignmentId) || null
          if (!before) return
          const after: Assignment = { ...before, ...patch }
          pushSnapshot()
          set((s) => {
            const next = s.assignments.map((a) => (a.id === assignmentId ? after : a))
            return { assignments: next, conflicts: detect(next), isPublished: false }
          })
          trackChange({
            id: genId(),
            kind: 'update',
            at: nowIso(),
            assignmentId,
            before,
            after,
          })
        },

        detectConflicts: (opts) => {
          const list = normalizeAssignments(opts?.assignments ?? get().assignments)
          const result = detect(list)
          if (!opts?.whatIf) set({ conflicts: result })
          return result
        },

        suggestResolutions: (assignmentId) => {
          try {
            const s = get()
            const conflicts = s.conflicts.get(String(assignmentId)) || []
            if (conflicts.length === 0) return []
            const engine = new SuggestionEngine({
              assignments: s.assignments,
              travelingTeacherRoutes: s.travelingTeacherRoutes,
              seasonMode: s.currentSeason,
            })
            return engine
              .suggestBestSolutionsForAssignment(String(assignmentId), conflicts)
              .slice(0, 3)
          } catch {
            return []
          }
        },

        undo: () => {
          const s = get()
          const prev = s.undoStack[0]
          if (!prev) return
          set((cur) => ({
            redoStack: [snapshotFrom(cur), ...cur.redoStack].slice(0, 50),
            undoStack: cur.undoStack.slice(1),
            assignments: normalizeAssignments(prev.assignments),
            conflicts: deserializeConflicts(prev.conflicts),
            timetableVersion: prev.timetableVersion,
            isPublished: prev.isPublished,
            lastPublishedAt: prev.lastPublishedAt ? new Date(prev.lastPublishedAt) : null,
            pendingChanges: safeArray<Change>(prev.pendingChanges),
            currentSeason: prev.currentSeason,
            travelingTeacherRoutes: normalizeRouteList(prev.travelingTeacherRoutes),
          }))
        },

        redo: () => {
          const s = get()
          const next = s.redoStack[0]
          if (!next) return
          set((cur) => ({
            undoStack: [snapshotFrom(cur), ...cur.undoStack].slice(0, 50),
            redoStack: cur.redoStack.slice(1),
            assignments: normalizeAssignments(next.assignments),
            conflicts: deserializeConflicts(next.conflicts),
            timetableVersion: next.timetableVersion,
            isPublished: next.isPublished,
            lastPublishedAt: next.lastPublishedAt ? new Date(next.lastPublishedAt) : null,
            pendingChanges: safeArray<Change>(next.pendingChanges),
            currentSeason: next.currentSeason,
            travelingTeacherRoutes: normalizeRouteList(next.travelingTeacherRoutes),
          }))
        },

        publish: () => {
          pushSnapshot()
          set((s) => ({
            isPublished: true,
            lastPublishedAt: new Date(),
            pendingChanges: [],
            conflicts: detect(s.assignments),
          }))
          trackChange({ id: genId(), kind: 'publish', at: nowIso() })
        },

        generateFromScratch: (opts) => {
          pushSnapshot()
          set(() => ({
            assignments: [],
            conflicts: new Map(),
            timetableVersion: opts?.version || 'normal',
            currentSeason: opts?.season || 'normal',
            isPublished: false,
            lastPublishedAt: null,
            pendingChanges: [],
          }))
          trackChange({
            id: genId(),
            kind: 'generate',
            at: nowIso(),
            meta: { seed: opts?.seed, version: opts?.version, season: opts?.season },
          })
        },

        switchSeason: (season) => {
          if (!season) return
          pushSnapshot()
          set((s) => ({
            currentSeason: season,
            conflicts: detect(s.assignments),
          }))
        },

        addTravelingTeacherRoute: (route) => {
          if (!route || !route.id) return
          pushSnapshot()
          set((s) => {
            const next = [...s.travelingTeacherRoutes.filter((r) => r.id !== route.id), route]
            return { travelingTeacherRoutes: next, conflicts: detect(s.assignments) }
          })
          trackChange({ id: genId(), kind: 'route', at: nowIso(), meta: { routeId: route.id } })
        },

        optimizeWorkload: () => {
          pushSnapshot()
          set((s) => ({ conflicts: detect(s.assignments) }))
          trackChange({ id: genId(), kind: 'optimize', at: nowIso() })
        },

        loadFromApi: async (opts = {}) => {
          const {
            term = 'Term 1',
            academicYear = new Date().getFullYear().toString(),
            status = 'published',
          } = opts
          try {
            const qs = new URLSearchParams({
              term,
              academicYear,
              ...(status ? { status } : {}),
            })
            const res = await fetch(`/api/timetable/view?${qs}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('Failed to fetch timetable')
            const data = await res.json()
            const assignments = Array.isArray(data.assignments) ? data.assignments : []

            set({
              assignments,
              conflicts: detect(assignments),
              isPublished: status === 'published',
              lastPublishedAt: status === 'published' ? new Date() : null,
            })
            return data
          } catch (err) {
            console.error('[timetableStore loadFromApi]', err)
            return null
          }
        },

        getConflictCount: () => {
          const m = get().conflicts
          let total = 0
          for (const v of m.values()) total += v.length
          return total
        },

        getAssignmentsByTeacher: (teacherId) => {
          return get().assignments.filter((a) => String(a.teacherId) === String(teacherId))
        },

        getAssignmentsByClass: (classId) => {
          return get().assignments.filter((a) => String(a.classId) === String(classId))
        },

        getAssignmentsByDay: (dayOfWeek) => {
          return get().assignments.filter((a) => a.dayOfWeek === dayOfWeek)
        },

        isTeacherAvailable: (teacherId, dayOfWeek, startTime, endTime) => {
          try {
            const detector = new CollisionDetector({
              assignments: get().assignments,
              travelingTeacherRoutes: get().travelingTeacherRoutes,
              seasonMode: get().currentSeason,
            })
            return detector.isTeacherAvailable(String(teacherId), dayOfWeek, startTime, endTime)
          } catch {
            return true
          }
        },

        getTeacherWorkload: (teacherId) => {
          const list = get().assignments.filter((a) => String(a.teacherId) === String(teacherId))
          const byDay: Partial<Record<Assignment['dayOfWeek'], number>> = {}
          for (const a of list) byDay[a.dayOfWeek] = (byDay[a.dayOfWeek] || 0) + 1
          return { totalPeriods: list.length, byDay }
        },
      }
    },
    {
      name: 'zsms-timetable-store-v1',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return window.localStorage
      }),
      partialize: (state) => ({
        assignments: state.assignments,
        conflicts: serializeConflicts(state.conflicts),
        timetableVersion: state.timetableVersion,
        isPublished: state.isPublished,
        lastPublishedAt: state.lastPublishedAt ? state.lastPublishedAt.toISOString() : null,
        pendingChanges: state.pendingChanges,
        undoStack: state.undoStack,
        redoStack: state.redoStack,
        currentSeason: state.currentSeason,
        travelingTeacherRoutes: state.travelingTeacherRoutes,
      }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Record<string, unknown>
        return {
          ...current,
          assignments: normalizeAssignments(p.assignments),
          conflicts: deserializeConflicts(p.conflicts),
          timetableVersion: (p.timetableVersion as TimetableVersion) || current.timetableVersion,
          isPublished: Boolean(p.isPublished),
          lastPublishedAt: p.lastPublishedAt ? new Date(String(p.lastPublishedAt)) : null,
          pendingChanges: safeArray<Change>(p.pendingChanges),
          undoStack: safeArray<TimetableSnapshot>(p.undoStack),
          redoStack: safeArray<TimetableSnapshot>(p.redoStack),
          currentSeason: (p.currentSeason as TimetableSeasonMode) || current.currentSeason,
          travelingTeacherRoutes: normalizeRouteList(p.travelingTeacherRoutes),
        } satisfies TimetableStoreState
      },
    }
  )
)
