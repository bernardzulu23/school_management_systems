/** Official result entry types for term-based grading. */
export const RESULT_TYPES = {
  END_OF_TERM: 'END_OF_TERM',
  MIDTERM: 'MIDTERM',
  CLASS_TEST: 'CLASS_TEST',
}

export const RESULT_TYPE_LABELS = {
  [RESULT_TYPES.END_OF_TERM]: 'End of term',
  [RESULT_TYPES.MIDTERM]: 'Midterm',
  [RESULT_TYPES.CLASS_TEST]: 'Class test',
}

/** Visible on headteacher / HOD school-wide results views. */
export const SCHOOL_WIDE_RESULT_TYPES = [RESULT_TYPES.END_OF_TERM, RESULT_TYPES.MIDTERM]

/** All types teachers may enter. */
export const TEACHER_ENTRY_RESULT_TYPES = [
  RESULT_TYPES.END_OF_TERM,
  RESULT_TYPES.MIDTERM,
  RESULT_TYPES.CLASS_TEST,
]

export function normalizeResultType(value, { defaultType = RESULT_TYPES.END_OF_TERM } = {}) {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (raw === 'END_OF_TERM' || raw === 'ENDOFTERM' || raw === 'EOT') {
    return RESULT_TYPES.END_OF_TERM
  }
  if (raw === 'MIDTERM' || raw === 'MID_TERM' || raw === 'MID') {
    return RESULT_TYPES.MIDTERM
  }
  if (raw === 'CLASS_TEST' || raw === 'CLASSTEST' || raw === 'TEST') {
    return RESULT_TYPES.CLASS_TEST
  }

  if (Object.values(RESULT_TYPES).includes(raw)) return raw
  return defaultType
}

export function getResultTypeLabel(value) {
  const key = normalizeResultType(value)
  return RESULT_TYPE_LABELS[key] || 'End of term'
}

export function isSchoolWideResultType(value) {
  return SCHOOL_WIDE_RESULT_TYPES.includes(normalizeResultType(value))
}
