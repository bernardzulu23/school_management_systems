/**
 * Lesson/block ordering helpers — spread teachers and classes across the week.
 */

export type OrderableLesson = {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  consecutivePeriods?: number | null
}

export type OrderableBlock = {
  blockId: string
  teacherId: string
  classId: string
  subjectId: string
  span: number
}

function lessonSize(item: { consecutivePeriods?: number | null; span?: number }) {
  return Math.max(1, Number(item.consecutivePeriods ?? item.span) || 1)
}

function roundRobinByTeacher<T extends { teacherId: string }>(group: T[]): T[] {
  const byTeacher = new Map<string, T[]>()
  for (const item of group) {
    const tid = String(item.teacherId)
    if (!byTeacher.has(tid)) byTeacher.set(tid, [])
    byTeacher.get(tid)!.push(item)
  }
  const teachers = Array.from(byTeacher.keys())
  const maxLen = Math.max(0, ...teachers.map((t) => byTeacher.get(t)!.length))
  const result: T[] = []
  for (let i = 0; i < maxLen; i++) {
    for (const tid of teachers) {
      const bucket = byTeacher.get(tid)!
      if (i < bucket.length) result.push(bucket[i])
    }
  }
  return result
}

/** Triples first, then interleaved doubles, then interleaved singles. */
export function interleaveLessons<T extends OrderableLesson>(lessons: T[]): T[] {
  const triples = lessons.filter((l) => lessonSize(l) >= 3)
  const doubles = lessons.filter((l) => lessonSize(l) === 2)
  const singles = lessons.filter((l) => lessonSize(l) === 1)
  return [
    ...roundRobinByTeacher(triples),
    ...roundRobinByTeacher(doubles),
    ...roundRobinByTeacher(singles),
  ]
}

export function interleaveBlocks<T extends OrderableBlock>(blocks: T[]): T[] {
  const triples = blocks.filter((b) => lessonSize(b) >= 3)
  const doubles = blocks.filter((b) => lessonSize(b) === 2)
  const singles = blocks.filter((b) => lessonSize(b) === 1)
  return [
    ...roundRobinByTeacher(triples),
    ...roundRobinByTeacher(doubles),
    ...roundRobinByTeacher(singles),
  ]
}

export function compareDaySpread(opts: {
  teacherId: string
  classId: string
  subjectId: string
  dayA: string
  dayB: string
  teacherDayLoad: Map<string, number>
  classSubjectDayLoad: Map<string, number>
  teacherMultiPenalty?: (teacherId: string, day: string) => number
}): number {
  const { teacherId, classId, subjectId, dayA, dayB, teacherDayLoad, classSubjectDayLoad } = opts
  const csA = classSubjectDayLoad.get(`${classId}|${subjectId}|${dayA}`) || 0
  const csB = classSubjectDayLoad.get(`${classId}|${subjectId}|${dayB}`) || 0
  if (csA !== csB) return csA - csB

  const la = teacherDayLoad.get(`${teacherId}|${dayA}`) || 0
  const lb = teacherDayLoad.get(`${teacherId}|${dayB}`) || 0
  const penaltyA = opts.teacherMultiPenalty?.(teacherId, dayA) || 0
  const penaltyB = opts.teacherMultiPenalty?.(teacherId, dayB) || 0
  const scoreA = la + penaltyA
  const scoreB = lb + penaltyB

  const aEmpty = la === 0 ? 0 : 1
  const bEmpty = lb === 0 ? 0 : 1
  if (aEmpty !== bEmpty) return aEmpty - bEmpty

  return scoreA - scoreB
}
