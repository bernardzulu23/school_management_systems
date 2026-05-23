import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Assignment,
  Class,
  Classroom,
  Conflict,
  ConflictReport,
  Teacher,
  TravelingTeacherRoute,
} from '@/lib/timetable/types'
import { CollisionDetector } from '@/lib/timetable/collisionDetector'
import { SuggestionEngine, type Suggestion } from '@/lib/timetable/suggestionEngine'

export interface UseCollisionDetectionProps {
  assignments: Assignment[]
  allTeachers: Teacher[]
  allClassrooms?: Classroom[]
  allClasses: Class[]
  onConflictChange?: (conflicts: ConflictReport) => void
  season?: 'normal' | 'planting' | 'harvest'
  travelingTeacherRoutes?: TravelingTeacherRoute[]
}

function buildReport(
  scheduleId: string,
  season: UseCollisionDetectionProps['season'],
  conflicts: Map<string, Conflict[]>
): ConflictReport {
  const mappedSeason =
    season === 'harvest'
      ? ('farming' as const)
      : season === 'planting'
        ? ('planting' as const)
        : ('normal' as const)
  const all = Array.from(conflicts.values()).flat()
  const byType: Partial<Record<Conflict['type'], number>> = {}
  let critical = 0
  let high = 0
  let medium = 0
  let low = 0

  for (const c of all) {
    byType[c.type] = (byType[c.type] || 0) + 1
    if (c.severity === 'critical') critical += 1
    else if (c.severity === 'high') high += 1
    else if (c.severity === 'medium') medium += 1
    else low += 1
  }

  return {
    id: scheduleId,
    scheduleId,
    generatedAt: new Date().toISOString(),
    season: mappedSeason || 'all',
    conflicts: all,
    summary: {
      total: all.length,
      critical,
      high,
      medium,
      low,
      byType,
    },
    hardViolations: [],
    optimization: { score: 0, breakdown: [] },
    recommendations: [],
  }
}

function genId() {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function useCollisionDetection(props: UseCollisionDetectionProps) {
  const {
    assignments,
    allTeachers,
    allClassrooms = [],
    allClasses,
    onConflictChange,
    season = 'normal',
    travelingTeacherRoutes = [],
  } = props

  const [conflicts, setConflicts] = useState<Map<string, Conflict[]>>(new Map())
  const [conflictReport, setConflictReport] = useState<ConflictReport>(() =>
    buildReport(genId(), season, new Map())
  )

  const cacheRef = useRef<Map<string, Conflict[]>>(new Map())
  const debounceRef = useRef<number | null>(null)

  const detector = useMemo(() => {
    return new CollisionDetector({
      assignments,
      teachers: allTeachers,
      classrooms: allClassrooms,
      classes: allClasses,
      travelingTeacherRoutes,
      seasonMode: season,
    })
  }, [assignments, allTeachers, allClassrooms, allClasses, travelingTeacherRoutes, season])

  const suggestionEngine = useMemo(() => {
    return new SuggestionEngine({
      assignments,
      teachers: allTeachers,
      classrooms: allClassrooms,
      travelingTeacherRoutes,
      seasonMode: season,
    })
  }, [assignments, allTeachers, allClassrooms, travelingTeacherRoutes, season])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      try {
        const next = detector.detectAllConflicts()
        cacheRef.current = next
        setConflicts(next)
        const report = buildReport(genId(), season, next)
        setConflictReport(report)
        onConflictChange?.(report)
      } catch {
        const fallback = new Map<string, Conflict[]>()
        cacheRef.current = fallback
        setConflicts(fallback)
        const report = buildReport(genId(), season, fallback)
        setConflictReport(report)
        onConflictChange?.(report)
      }
    }, 150)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [detector, onConflictChange, season])

  const validateAssignment = (assignment: Assignment) => {
    try {
      return detector.validateAssignment(assignment)
    } catch {
      return []
    }
  }

  const suggestAlternatives = (assignment: Assignment): Suggestion[] => {
    try {
      const current = cacheRef.current.get(String(assignment.id)) || []
      if (current.length === 0) return []
      return suggestionEngine.suggestBestSolutionsForAssignment(String(assignment.id), current)
    } catch {
      return []
    }
  }

  const isAssignmentValid = (assignment: Assignment) => validateAssignment(assignment).length === 0

  const getConflictCount = () => {
    let total = 0
    for (const v of conflicts.values()) total += v.length
    return total
  }

  const getCriticalConflictCount = () => {
    let total = 0
    for (const v of conflicts.values()) total += v.filter((c) => c.severity === 'critical').length
    return total
  }

  return {
    conflicts,
    conflictReport,
    validateAssignment,
    suggestAlternatives,
    isAssignmentValid,
    getConflictCount,
    getCriticalConflictCount,
  }
}
