/**
 * Aggregate Result rows for primary term analysis (week 2 / week 7 / EOT).
 */
import {
  getResultTypeLabel,
  listPrimaryResultTypes,
  normalizeResultType,
  PRIMARY_RESULT_TYPES,
  RESULT_TYPES,
} from '@/lib/results/resultTypes'

function avg(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function bucketGrade(gradeRaw) {
  const g = String(gradeRaw || '')
    .trim()
    .toUpperCase()
  if (!g) return 'Unknown'
  if (g.startsWith('A') || g === '1' || g === '2') return 'Distinction'
  if (g.startsWith('B') || g === '3' || g === '4') return 'Merit'
  if (g.startsWith('C') || g === '5' || g === '6') return 'Credit'
  if (g.startsWith('D') || g === '7') return 'Pass'
  if (g.startsWith('F') || g === '8' || g === '9') return 'Fail'
  return g
}

export function parseTermParam(termRaw) {
  const raw = String(termRaw || '').trim()
  if (!raw) return null
  const normalized = raw.toLowerCase()
  if (normalized.startsWith('term')) {
    const digits = normalized.replace(/[^0-9]/g, '')
    if (digits) return `Term ${Number(digits)}`
  }
  return raw
}

export function currentTermLabel(date = new Date()) {
  const month = date.getUTCMonth()
  if (month < 4) return 'Term 1'
  if (month < 8) return 'Term 2'
  return 'Term 3'
}

/**
 * @param {Array<{ score: number, grade: string, subjectId: string, resultType: string, enteredByUserId?: string|null, studentId: string }>} rows
 * @param {Map<string, string>} [subjectNameById]
 */
export function buildPrimaryResultsAnalysis(rows, subjectNameById = new Map()) {
  const scores = rows.map((r) => Number(r.score)).filter((n) => Number.isFinite(n))
  const bySubject = new Map()
  const byType = new Map()
  const gradeBuckets = new Map()

  for (const r of rows) {
    const sid = String(r.subjectId || '')
    const type = normalizeResultType(r.resultType, { defaultType: RESULT_TYPES.END_OF_TERM })
    const score = Number(r.score)
    if (!bySubject.has(sid)) bySubject.set(sid, [])
    bySubject.get(sid).push(score)
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type).push(score)
    const bucket = bucketGrade(r.grade)
    gradeBuckets.set(bucket, (gradeBuckets.get(bucket) || 0) + 1)
  }

  const subjectBreakdown = Array.from(bySubject.entries()).map(([subjectId, list]) => ({
    subjectId,
    subjectName: subjectNameById.get(subjectId) || subjectId,
    count: list.length,
    average: Math.round(avg(list.filter(Number.isFinite)) * 10) / 10,
  }))

  const typeBreakdown = Array.from(byType.entries()).map(([resultType, list]) => ({
    resultType,
    label: getResultTypeLabel(resultType),
    count: list.length,
    average: Math.round(avg(list.filter(Number.isFinite)) * 10) / 10,
  }))

  return {
    resultTypes: listPrimaryResultTypes(),
    summary: {
      totalEntries: rows.length,
      uniqueStudents: new Set(rows.map((r) => r.studentId)).size,
      averageScore: Math.round(avg(scores) * 10) / 10,
    },
    subjectBreakdown: subjectBreakdown.sort((a, b) => b.count - a.count),
    typeBreakdown,
    gradeDistribution: Array.from(gradeBuckets.entries()).map(([grade, count]) => ({
      grade,
      count,
    })),
  }
}

export function primaryResultTypeFilter(resultTypeRaw) {
  const raw = String(resultTypeRaw || '').trim()
  if (!raw || raw.toLowerCase() === 'all') return null
  const normalized = normalizeResultType(raw, { defaultType: null })
  if (normalized && PRIMARY_RESULT_TYPES.includes(normalized)) return normalized
  return null
}
