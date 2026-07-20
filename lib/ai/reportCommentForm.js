/**
 * Pure helpers for teacher AI Report Comments form wiring.
 * Keeps page logic testable without hitting the LLM.
 */

/** Result scores in the gradebook are percentage points (0–100). */
export const RESULT_MAX_MARKS = 100

/**
 * Unique classes from teaching-assignment DTOs.
 * @param {Array<{ classId?: string, className?: string, classYearGroup?: string | null }>} assignments
 */
export function uniqueClassesFromAssignments(assignments) {
  const list = Array.isArray(assignments) ? assignments : []
  const byId = new Map()
  for (const a of list) {
    const classId = String(a?.classId || '').trim()
    if (!classId || byId.has(classId)) continue
    byId.set(classId, {
      classId,
      className: String(a?.className || 'Class').trim() || 'Class',
      classYearGroup: a?.classYearGroup != null ? String(a.classYearGroup).trim() : '',
    })
  }
  return Array.from(byId.values()).sort((a, b) => a.className.localeCompare(b.className))
}

/**
 * Subjects the teacher teaches for a given class.
 * @param {Array<{ classId?: string, subjectId?: string, subjectName?: string }>} assignments
 * @param {string} classId
 */
export function subjectsForClass(assignments, classId) {
  const cid = String(classId || '').trim()
  const list = Array.isArray(assignments) ? assignments : []
  const byId = new Map()
  for (const a of list) {
    if (String(a?.classId || '').trim() !== cid) continue
    const subjectId = String(a?.subjectId || '').trim()
    if (!subjectId || byId.has(subjectId)) continue
    byId.set(subjectId, {
      subjectId,
      subjectName: String(a?.subjectName || 'Subject').trim() || 'Subject',
    })
  }
  return Array.from(byId.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName))
}

/**
 * Prefer Class.year_group; fall back to class name.
 * @param {{ classYearGroup?: string | null, className?: string | null } | null | undefined} classInfo
 */
export function gradeLabelFromClass(classInfo) {
  const yearGroup = String(classInfo?.classYearGroup || '').trim()
  if (yearGroup) return yearGroup
  return String(classInfo?.className || '').trim()
}

/**
 * Derive a short attendance label from recent records (present/late count as attended).
 * Returns empty string when there is no data — callers must not invent values.
 * @param {Array<{ status?: string }>} records
 * @returns {{ rate: number | null, label: string }}
 */
export function attendanceFromRecords(records) {
  const rows = Array.isArray(records) ? records : []
  if (rows.length === 0) return { rate: null, label: '' }

  let attended = 0
  for (const r of rows) {
    const status = String(r?.status || '')
      .trim()
      .toLowerCase()
    if (status === 'present' || status === 'late') attended += 1
  }
  const rate = Math.round((attended / rows.length) * 100)
  let band = 'Irregular'
  if (rate >= 90) band = 'Excellent'
  else if (rate >= 75) band = 'Regular'
  return { rate, label: `${band} (${rate}%)` }
}

/**
 * Pick the most recently updated result for a subject (optional filter).
 * @param {Array<{ subjectId?: string, score?: number, updatedAt?: string | Date }>} results
 * @param {string} [subjectId]
 */
export function pickLatestResult(results, subjectId) {
  const sid = String(subjectId || '').trim()
  const list = (Array.isArray(results) ? results : []).filter((r) => {
    if (!sid) return true
    return String(r?.subjectId || '').trim() === sid
  })
  if (list.length === 0) return null
  return [...list].sort((a, b) => {
    const ta = new Date(a?.updatedAt || 0).getTime()
    const tb = new Date(b?.updatedAt || 0).getTime()
    return tb - ta
  })[0]
}

/**
 * Marks fields from a result record. Empty when no result — avoid misleading 0/100.
 * @param {{ score?: number } | null | undefined} result
 * @returns {{ marks: number | '', maxMarks: number | '' }}
 */
export function marksFromResult(result) {
  if (!result || result.score === null || result.score === undefined || result.score === '') {
    return { marks: '', maxMarks: '' }
  }
  const score = Number(result.score)
  if (!Number.isFinite(score)) return { marks: '', maxMarks: '' }
  return { marks: score, maxMarks: RESULT_MAX_MARKS }
}

/**
 * Build the POST body expected by `/api/ai/report-comments`.
 * @param {object} form
 */
export function buildReportCommentPayload(form) {
  const marksRaw = form?.marks
  const maxRaw = form?.maxMarks
  const marks =
    marksRaw === '' || marksRaw === null || marksRaw === undefined ? undefined : Number(marksRaw)
  const maxMarks =
    maxRaw === '' || maxRaw === null || maxRaw === undefined ? undefined : Number(maxRaw)

  return {
    studentName: String(form?.studentName || '').trim(),
    grade: String(form?.grade || '').trim(),
    subject: String(form?.subject || '').trim(),
    marks,
    maxMarks,
    behavior: String(form?.behavior || '').trim() || 'Good',
    attendance: String(form?.attendance || '').trim() || 'Regular',
    strengths: String(form?.strengths || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    areasForImprovement: String(form?.areasForImprovement || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    ...(form?.studentId ? { studentId: String(form.studentId).trim() } : {}),
    ...(form?.subjectId ? { subjectId: String(form.subjectId).trim() } : {}),
  }
}

/**
 * Whether the form has the minimum fields the API requires.
 */
export function canGenerateReportComment(form) {
  const name = String(form?.studentName || '').trim()
  const grade = String(form?.grade || '').trim()
  const subject = String(form?.subject || '').trim()
  const marks = form?.marks
  const maxMarks = form?.maxMarks
  const marksOk =
    marks !== '' && marks !== null && marks !== undefined && Number.isFinite(Number(marks))
  const maxOk =
    maxMarks !== '' &&
    maxMarks !== null &&
    maxMarks !== undefined &&
    Number.isFinite(Number(maxMarks)) &&
    Number(maxMarks) > 0
  return Boolean(name && grade && subject && marksOk && maxOk)
}
