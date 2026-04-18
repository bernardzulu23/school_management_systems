import type {
  Assignment,
  Class,
  Classroom,
  Teacher,
  TimeSlot,
  TravelingTeacherRoute,
} from './types'
import { CollisionDetector } from './collisionDetector'

export type AutomationQuality = 'fast' | 'balanced' | 'perfect'

export interface AutomationOptions {
  quality: AutomationQuality
  timeout: number
  seed: number
  onProgress?: (progress: number) => void
  stopOnBestFound: boolean
}

export interface TimetableRequirement {
  classId: Class['id']
  subjectId: Assignment['subjectId']
  periodsPerWeek: number
  preferredTeacherIds?: Array<Teacher['id']>
  preferredClassroomIds?: Array<Classroom['id']>
}

export interface TimetableSchoolData {
  timeSlots: TimeSlot[]
  teachers: Teacher[]
  classrooms: Classroom[]
  classes: Class[]
  requirements?: TimetableRequirement[]
  travelingTeacherRoutes?: TravelingTeacherRoute[]
  seasonMode?: 'normal' | 'planting' | 'harvest'
}

export interface AutomationResult {
  assignments: Assignment[]
  constraints: {
    hardConstraints: { satisfied: number; violated: number }
    softConstraints: { penalties: Map<string, number>; totalPenalty: number }
  }
  statistics: {
    generationsTaken: number
    timeMs: number
    teacherWorkloadVariance: number
    conflictCount: number
    qualityScore: number
  }
  metadata: {
    generatedAt: Date
    algorithm: 'csp+ga'
    seed: number
  }
}

function genId() {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function stableKey(data: TimetableSchoolData, opts: AutomationOptions) {
  const base = {
    q: opts.quality,
    seed: opts.seed,
    slots: data.timeSlots?.length || 0,
    teachers: data.teachers?.length || 0,
    rooms: data.classrooms?.length || 0,
    classes: data.classes?.length || 0,
    req: data.requirements?.length || 0,
    season: data.seasonMode || 'normal',
  }
  return JSON.stringify(base)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function teacherWorkloadVariance(assignments: Assignment[]) {
  const counts = new Map<string, number>()
  for (const a of assignments)
    counts.set(String(a.teacherId), (counts.get(String(a.teacherId)) || 0) + 1)
  const vals = Array.from(counts.values())
  if (vals.length <= 1) return 0
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
  return variance
}

function validateSchoolData(data: TimetableSchoolData) {
  if (!data) throw new Error('schoolData is required')
  if (!Array.isArray(data.timeSlots) || data.timeSlots.length === 0)
    throw new Error('timeSlots are required')
  if (!Array.isArray(data.teachers) || data.teachers.length === 0)
    throw new Error('teachers are required')
  if (!Array.isArray(data.classrooms) || data.classrooms.length === 0)
    throw new Error('classrooms are required')
  if (!Array.isArray(data.classes) || data.classes.length === 0)
    throw new Error('classes are required')
}

function buildRequirements(data: TimetableSchoolData): TimetableRequirement[] {
  if (Array.isArray(data.requirements) && data.requirements.length > 0) return data.requirements
  const out: TimetableRequirement[] = []
  for (const c of data.classes) {
    for (const s of c.subjects || []) {
      out.push({ classId: c.id, subjectId: s.id, periodsPerWeek: 1 })
    }
  }
  return out
}

function seasonToAssignmentSeason(mode: TimetableSchoolData['seasonMode']): Assignment['season'] {
  if (mode === 'planting') return 'planting'
  if (mode === 'harvest') return 'farming'
  return 'normal'
}

function choose<T>(rng: () => number, list: T[]): T | null {
  if (!list.length) return null
  return list[Math.floor(rng() * list.length)] || null
}

function makeAssignmentBase(
  data: TimetableSchoolData,
  req: TimetableRequirement,
  teacherId: Teacher['id'],
  classroomId: Classroom['id'],
  slot: TimeSlot
): Assignment {
  const season = seasonToAssignmentSeason(data.seasonMode)
  return {
    id: genId(),
    season,
    dayOfWeek: slot.dayOfWeek,
    timeSlotId: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    period: slot.period,
    isBreak: slot.isBreak,
    teacherId,
    classId: req.classId,
    subjectId: req.subjectId,
    classroomId,
    source: 'generated',
  }
}

function buildHardIndexes(assignments: Assignment[]) {
  const teacher = new Set<string>()
  const room = new Set<string>()
  const cls = new Set<string>()
  const key = (a: Assignment) => `${a.season}|${a.dayOfWeek}|${a.startTime}|${a.endTime}`
  for (const a of assignments) {
    const k = key(a)
    teacher.add(`${a.teacherId}|${k}`)
    room.add(`${a.classroomId}|${k}`)
    cls.add(`${a.classId}|${k}`)
  }
  return { teacher, room, cls, key }
}

function hasHardCollision(index: ReturnType<typeof buildHardIndexes>, a: Assignment) {
  const k = index.key(a)
  if (index.teacher.has(`${a.teacherId}|${k}`)) return true
  if (index.room.has(`${a.classroomId}|${k}`)) return true
  if (index.cls.has(`${a.classId}|${k}`)) return true
  return false
}

function addToIndexes(index: ReturnType<typeof buildHardIndexes>, a: Assignment) {
  const k = index.key(a)
  index.teacher.add(`${a.teacherId}|${k}`)
  index.room.add(`${a.classroomId}|${k}`)
  index.cls.add(`${a.classId}|${k}`)
}

function evaluate(
  data: TimetableSchoolData,
  assignments: Assignment[],
  seed: number
): {
  hardViolated: number
  hardSatisfied: number
  softPenaltyTotal: number
  softPenalties: Map<string, number>
  conflictCount: number
  workloadVariance: number
  score: number
} {
  const detector = new CollisionDetector({
    assignments,
    timeSlots: data.timeSlots,
    teachers: data.teachers,
    classrooms: data.classrooms,
    classes: data.classes,
    travelingTeacherRoutes: data.travelingTeacherRoutes,
    seasonMode: data.seasonMode,
  })
  const conflictsByAssignment = detector.detectAllConflicts()
  let conflictCount = 0
  let critical = 0
  for (const list of conflictsByAssignment.values()) {
    conflictCount += list.length
    critical += list.filter((c) => c.severity === 'critical').length
  }

  const variance = teacherWorkloadVariance(assignments)
  const penalties = new Map<string, number>()
  penalties.set('teacherWorkloadVariance', variance * 10)

  const rng = mulberry32(seed)
  let gapPenalty = 0
  const byTeacherDay = new Map<string, Assignment[]>()
  for (const a of assignments) {
    const k = `${a.teacherId}|${a.dayOfWeek}`
    if (!byTeacherDay.has(k)) byTeacherDay.set(k, [])
    byTeacherDay.get(k)!.push(a)
  }
  for (const list of byTeacherDay.values()) {
    const sorted = [...list].sort((a, b) => a.period - b.period)
    for (let i = 1; i < sorted.length; i++) {
      const d = sorted[i].period - sorted[i - 1].period
      if (d > 1) gapPenalty += d - 1
    }
  }
  penalties.set('teacherGaps', gapPenalty * 2)

  let doubleLessonBonus = 0
  const byClassDay = new Map<string, Assignment[]>()
  for (const a of assignments) {
    const k = `${a.classId}|${a.dayOfWeek}`
    if (!byClassDay.has(k)) byClassDay.set(k, [])
    byClassDay.get(k)!.push(a)
  }
  for (const list of byClassDay.values()) {
    const sorted = [...list].sort((a, b) => a.period - b.period)
    for (let i = 1; i < sorted.length; i++) {
      if (
        sorted[i].subjectId === sorted[i - 1].subjectId &&
        sorted[i].period === sorted[i - 1].period + 1
      ) {
        doubleLessonBonus += 1
      }
    }
  }
  penalties.set('doubleLessons', Math.max(0, 5 - doubleLessonBonus))

  const softTotal = Array.from(penalties.values()).reduce((s, v) => s + v, 0)
  const hardViolated = critical
  const hardSatisfied = Math.max(0, assignments.length - hardViolated)

  const noise = rng() * 0.01
  const score = hardViolated * 1_000_000 + softTotal + noise

  return {
    hardViolated,
    hardSatisfied,
    softPenaltyTotal: softTotal,
    softPenalties: penalties,
    conflictCount,
    workloadVariance: variance,
    score,
  }
}

export class AutomationService {
  private cache = new Map<string, AutomationResult>()
  private cancelFlag = false
  private progress = 0
  private startedAt: number | null = null

  getProgress() {
    return this.progress
  }

  getEstimatedTimeRemaining() {
    if (!this.startedAt) return null
    const elapsed = Date.now() - this.startedAt
    const p = clamp(this.progress, 1, 100)
    const total = (elapsed * 100) / p
    return Math.max(0, Math.round(total - elapsed))
  }

  cancelGeneration() {
    this.cancelFlag = true
  }

  async generateOptimalTimetable(
    schoolData: TimetableSchoolData,
    options: AutomationOptions
  ): Promise<AutomationResult> {
    validateSchoolData(schoolData)
    if (!options) throw new Error('options are required')
    if (!Number.isFinite(options.timeout) || options.timeout <= 0)
      throw new Error('timeout must be > 0')
    if (!Number.isFinite(options.seed)) throw new Error('seed is required')

    const key = stableKey(schoolData, options)
    const cached = this.cache.get(key)
    if (cached) return cached

    this.cancelFlag = false
    this.startedAt = Date.now()
    this.progress = 0
    options.onProgress?.(0)

    const deadline = Date.now() + options.timeout
    const rng = mulberry32(options.seed)

    const reqs = buildRequirements(schoolData)
    this.progress = 10
    options.onProgress?.(10)

    const initial = this.runCspSolver(schoolData, reqs, rng, deadline, options)
    this.progress = 30
    options.onProgress?.(30)

    const optimized = this.runGeneticOptimizer(schoolData, initial, rng, deadline, options)
    const evald = evaluate(schoolData, optimized.assignments, options.seed)
    const totalMs = Date.now() - this.startedAt

    const qualityScore = this.computeQualityScore(evald.hardViolated, evald.softPenaltyTotal)
    const result: AutomationResult = {
      assignments: optimized.assignments,
      constraints: {
        hardConstraints: { satisfied: evald.hardSatisfied, violated: evald.hardViolated },
        softConstraints: { penalties: evald.softPenalties, totalPenalty: evald.softPenaltyTotal },
      },
      statistics: {
        generationsTaken: optimized.generationsTaken,
        timeMs: totalMs,
        teacherWorkloadVariance: evald.workloadVariance,
        conflictCount: evald.conflictCount,
        qualityScore,
      },
      metadata: {
        generatedAt: new Date(),
        algorithm: 'csp+ga',
        seed: options.seed,
      },
    }

    this.progress = 100
    options.onProgress?.(100)
    this.cache.set(key, result)
    return result
  }

  async generateInWorker(
    schoolData: TimetableSchoolData,
    options: AutomationOptions
  ): Promise<AutomationResult> {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return this.generateOptimalTimetable(schoolData, options)
    }
    return this.generateOptimalTimetable(schoolData, options)
  }

  private runCspSolver(
    data: TimetableSchoolData,
    requirements: TimetableRequirement[],
    rng: () => number,
    deadline: number,
    options: AutomationOptions
  ): Assignment[] {
    const season = seasonToAssignmentSeason(data.seasonMode)
    const slots = data.timeSlots.filter((s) => !s.isBreak)
    const teachers = data.teachers
    const rooms = data.classrooms

    const assignments: Assignment[] = []
    const index = buildHardIndexes(assignments)

    const teacherBySubject = new Map<string, Teacher[]>()
    for (const t of teachers) {
      for (const s of t.subjects || []) {
        const k = String(s.id)
        if (!teacherBySubject.has(k)) teacherBySubject.set(k, [])
        teacherBySubject.get(k)!.push(t)
      }
    }

    const roomCandidates = rooms.length ? rooms : []

    const expanded: TimetableRequirement[] = []
    for (const r of requirements) {
      const n = clamp(Number(r.periodsPerWeek || 0), 1, 20)
      for (let i = 0; i < n; i++) expanded.push({ ...r, periodsPerWeek: 1 })
    }

    const shuffled = [...expanded].sort(() => rng() - 0.5)
    for (const req of shuffled) {
      if (this.cancelFlag) break
      if (Date.now() > deadline) break

      const teacherPoolBase = req.preferredTeacherIds?.length
        ? teachers.filter((t) => req.preferredTeacherIds!.some((id) => String(id) === String(t.id)))
        : teacherBySubject.get(String(req.subjectId)) || []
      const teacherPool = teacherPoolBase.length ? teacherPoolBase : teachers

      const roomPool = req.preferredClassroomIds?.length
        ? rooms.filter((r) => req.preferredClassroomIds!.some((id) => String(id) === String(r.id)))
        : roomCandidates

      const teacher = choose(rng, teacherPool)
      const room = choose(rng, roomPool)
      if (!teacher || !room) continue

      let placed = false
      const slotOrder = [...slots].sort(() => rng() - 0.5)
      for (const slot of slotOrder) {
        const a = makeAssignmentBase(data, req, teacher.id, room.id, slot)
        a.season = season
        if (hasHardCollision(index, a)) continue
        const detector = new CollisionDetector({
          assignments: [...assignments, a],
          timeSlots: data.timeSlots,
          teachers: data.teachers,
          classrooms: data.classrooms,
          classes: data.classes,
          travelingTeacherRoutes: data.travelingTeacherRoutes,
          seasonMode: data.seasonMode,
        })
        const issues = detector.validateAssignment(a).filter((c) => c.severity === 'critical')
        if (issues.length > 0) continue
        assignments.push(a)
        addToIndexes(index, a)
        placed = true
        break
      }

      if (!placed) continue

      const p = clamp(
        10 + Math.floor((assignments.length / Math.max(1, expanded.length)) * 20),
        10,
        30
      )
      if (p - this.progress >= 5) {
        this.progress = p
        options.onProgress?.(p)
      }
    }

    return assignments
  }

  private runGeneticOptimizer(
    data: TimetableSchoolData,
    seedAssignments: Assignment[],
    rng: () => number,
    deadline: number,
    options: AutomationOptions
  ): { assignments: Assignment[]; generationsTaken: number } {
    const quality = options.quality
    const popSize = quality === 'perfect' ? 180 : quality === 'balanced' ? 120 : 80
    const generations = quality === 'perfect' ? 180 : quality === 'balanced' ? 120 : 60
    const mutateRate = quality === 'perfect' ? 0.08 : 0.05

    const slots = data.timeSlots.filter((s) => !s.isBreak)
    const initial = seedAssignments.length ? seedAssignments : []

    const makeCandidate = () => {
      const list = initial.map((a) => ({ ...a }))
      const m = Math.max(1, Math.floor(list.length * mutateRate))
      for (let i = 0; i < m; i++) {
        const idx = Math.floor(rng() * list.length)
        const slot = choose(rng, slots)
        if (!slot) continue
        list[idx] = {
          ...list[idx],
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          period: slot.period,
        }
      }
      return list
    }

    const population: Assignment[][] = []
    population.push(initial)
    while (population.length < popSize) population.push(makeCandidate())

    let best = initial
    let bestEval = evaluate(data, best, options.seed)
    let gen = 0

    for (gen = 0; gen < generations; gen++) {
      if (this.cancelFlag) break
      if (Date.now() > deadline) break

      const scored = population
        .map((p) => ({ p, e: evaluate(data, p, options.seed + gen) }))
        .sort((a, b) => a.e.score - b.e.score)

      if (scored[0] && scored[0].e.score < bestEval.score) {
        best = scored[0].p
        bestEval = scored[0].e
      }

      const pProgress = clamp(30 + Math.floor(((gen + 1) / generations) * 60), 30, 90)
      if (pProgress - this.progress >= 5) {
        this.progress = pProgress
        options.onProgress?.(pProgress)
      }

      const hardOk = bestEval.hardViolated === 0
      const softOk = bestEval.softPenaltyTotal < 2
      if (options.stopOnBestFound && hardOk && softOk) break

      const eliteCount = Math.max(1, Math.floor(popSize * 0.2))
      const elites = scored.slice(0, eliteCount).map((x) => x.p)

      const nextPop: Assignment[][] = [...elites]
      while (nextPop.length < popSize) {
        const p1 = choose(rng, elites) || elites[0]
        const p2 = choose(rng, elites) || elites[0]
        const child = this.crossover(rng, p1, p2)
        this.mutate(rng, child, slots, mutateRate)
        this.repair(data, child, rng)
        nextPop.push(child)
      }
      population.splice(0, population.length, ...nextPop)
    }

    return { assignments: best, generationsTaken: gen + 1 }
  }

  private crossover(rng: () => number, a: Assignment[], b: Assignment[]) {
    if (!a.length) return b.map((x) => ({ ...x }))
    if (!b.length) return a.map((x) => ({ ...x }))
    const cut = Math.floor(rng() * Math.min(a.length, b.length))
    const child = []
    for (let i = 0; i < a.length; i++) {
      const src = i < cut ? a : b
      child.push({ ...src[i] })
    }
    return child
  }

  private mutate(rng: () => number, candidate: Assignment[], slots: TimeSlot[], rate: number) {
    if (!candidate.length) return
    const m = Math.max(1, Math.floor(candidate.length * rate))
    for (let i = 0; i < m; i++) {
      const idx = Math.floor(rng() * candidate.length)
      const slot = choose(rng, slots)
      if (!slot) continue
      candidate[idx] = {
        ...candidate[idx],
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        period: slot.period,
      }
    }
  }

  private repair(data: TimetableSchoolData, candidate: Assignment[], rng: () => number) {
    if (!candidate.length) return
    const detector = new CollisionDetector({
      assignments: candidate,
      timeSlots: data.timeSlots,
      teachers: data.teachers,
      classrooms: data.classrooms,
      classes: data.classes,
      travelingTeacherRoutes: data.travelingTeacherRoutes,
      seasonMode: data.seasonMode,
    })
    const by = detector.detectAllConflicts()
    const slots = data.timeSlots.filter((s) => !s.isBreak)
    for (const [id, list] of by.entries()) {
      const critical = list.some((c) => c.severity === 'critical')
      if (!critical) continue
      const idx = candidate.findIndex((a) => String(a.id) === String(id))
      if (idx < 0) continue
      const base = candidate[idx]
      for (let t = 0; t < 8; t++) {
        const slot = choose(rng, slots)
        if (!slot) continue
        const next: Assignment = {
          ...base,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          period: slot.period,
        }
        const test = [...candidate]
        test[idx] = next
        const d = new CollisionDetector({
          assignments: test,
          timeSlots: data.timeSlots,
          teachers: data.teachers,
          classrooms: data.classrooms,
          classes: data.classes,
          travelingTeacherRoutes: data.travelingTeacherRoutes,
          seasonMode: data.seasonMode,
        })
        if (d.validateAssignment(next).filter((c) => c.severity === 'critical').length === 0) {
          candidate[idx] = next
          break
        }
      }
    }
  }

  private computeQualityScore(hardViolations: number, softPenalty: number) {
    if (hardViolations > 0) return clamp(30 - hardViolations, 0, 30)
    const soft = clamp(100 - Math.round(softPenalty), 30, 100)
    return soft
  }
}

export const automationService = new AutomationService()
