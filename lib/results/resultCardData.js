/**
 * Load a student's entered results for printable/shareable result cards.
 * Intentionally omits teacher identity (enteredByUserId / teacher names).
 */

import { calculateGrade } from '@/lib/gradingSystem'
import { getResultTypeLabel, normalizeResultType } from '@/lib/results/resultTypes'

function avg(values) {
  if (!values.length) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

function sanitizeFilenamePart(value) {
  return String(value || 'Student')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40)
}

/**
 * @param {{
 *   prisma: import('@prisma/client').PrismaClient
 *   schoolId: string
 *   studentId: string
 *   term?: string | null
 *   year?: number | null
 *   resultType?: string | null
 * }} opts
 */
export async function loadStudentResultCard(opts) {
  const { prisma, schoolId, studentId } = opts
  const term = String(opts.term || '').trim() || null
  const year = opts.year != null && opts.year !== '' ? Number(opts.year) : null
  const resultTypeRaw = String(opts.resultType || '').trim()
  const resultTypeFilter = resultTypeRaw
    ? normalizeResultType(resultTypeRaw, { defaultType: null }) ||
      String(resultTypeRaw)
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
    : null

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      name: true,
      class: true,
      exam_number: true,
      school: { select: { id: true, name: true, address: true } },
    },
  })
  if (!student) return null

  const rows = await prisma.result.findMany({
    where: {
      schoolId,
      studentId,
      ...(term ? { term } : {}),
      ...(year != null && !Number.isNaN(year) ? { year } : {}),
      ...(resultTypeFilter ? { resultType: resultTypeFilter } : {}),
    },
    select: {
      id: true,
      score: true,
      grade: true,
      term: true,
      year: true,
      resultType: true,
      comments: true,
      createdAt: true,
      subject: { select: { id: true, name: true } },
      // deliberately NOT selecting enteredByUserId
    },
    orderBy: [{ year: 'desc' }, { term: 'asc' }, { resultType: 'asc' }, { createdAt: 'asc' }],
    take: 2000,
  })

  const groupMap = new Map()
  for (const r of rows) {
    const score = Number(r.score)
    const grade =
      r.grade ||
      (Number.isFinite(score) ? calculateGrade(score, student.class || '')?.grade || '' : '')
    const typeKey = String(r.resultType || 'END_OF_TERM')
    const groupKey = `${r.year}|${r.term}|${typeKey}`
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        year: r.year,
        term: r.term,
        resultType: typeKey,
        resultTypeLabel: getResultTypeLabel(typeKey),
        rows: [],
        scores: [],
      })
    }
    const g = groupMap.get(groupKey)
    g.rows.push({
      id: r.id,
      subject: r.subject?.name || 'Unknown',
      score: Number.isFinite(score) ? Math.round(score * 10) / 10 : null,
      grade: String(grade || ''),
      comments: r.comments ? String(r.comments) : null,
      // no teacher fields
    })
    if (Number.isFinite(score)) g.scores.push(score)
  }

  const groups = Array.from(groupMap.values()).map((g) => {
    const average = avg(g.scores)
    return {
      year: g.year,
      term: g.term,
      resultType: g.resultType,
      resultTypeLabel: g.resultTypeLabel,
      subjectCount: g.rows.length,
      average: average == null ? null : Math.round(average * 10) / 10,
      rows: g.rows,
    }
  })

  const allScores = groups.flatMap((g) => g.rows.map((r) => r.score).filter((n) => n != null))
  const overallAverage = avg(allScores)

  return {
    school: {
      id: student.school?.id || schoolId,
      name: student.school?.name || 'School',
      address: student.school?.address || null,
    },
    student: {
      id: student.id,
      name: student.name,
      class: student.class || '',
      examNumber: student.exam_number || null,
    },
    filters: {
      term,
      year: year != null && !Number.isNaN(year) ? year : null,
      resultType: resultTypeFilter,
    },
    groups,
    summary: {
      totalResults: rows.length,
      groupCount: groups.length,
      overallAverage: overallAverage == null ? null : Math.round(overallAverage * 10) / 10,
    },
    generatedAt: new Date().toISOString(),
  }
}

/**
 * List students who have at least one result (for admin card picker).
 */
export async function listStudentsWithResults({ prisma, schoolId, q = '', limit = 50 }) {
  const query = String(q || '').trim()
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      results: { some: {} },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { exam_number: { contains: query, mode: 'insensitive' } },
              { class: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      class: true,
      exam_number: true,
      _count: { select: { results: true } },
    },
    orderBy: [{ class: 'asc' }, { name: 'asc' }],
    take: Math.min(Math.max(Number(limit) || 50, 1), 200),
  })

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    class: s.class || '',
    examNumber: s.exam_number || null,
    resultCount: s._count?.results || 0,
  }))
}

export function buildResultCardFilename(card, ext = 'pdf') {
  const name = sanitizeFilenamePart(card?.student?.name)
  const term = card?.filters?.term ? `_${sanitizeFilenamePart(card.filters.term)}` : ''
  const year = card?.filters?.year != null ? `_${card.filters.year}` : ''
  const type = card?.filters?.resultType
    ? `_${sanitizeFilenamePart(card.filters.resultType)}`
    : '_all'
  return `ResultCard_${name}${term}${year}${type}.${ext}`
}

export function canCreateStudentResultCards(user) {
  const role = String(user?.role || '').toLowerCase()
  return ['admin', 'administrator', 'headteacher', 'superadmin', 'hod'].includes(role)
}
