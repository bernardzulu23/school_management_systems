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
  const key = String(value || '')
    .trim()
    .toUpperCase()
  if (RESULT_TYPE_LABELS[key]) return RESULT_TYPE_LABELS[key]
  const normalized = normalizeResultType(value, { defaultType: null })
  if (normalized && RESULT_TYPE_LABELS[normalized]) return RESULT_TYPE_LABELS[normalized]
  if (!key) return 'Unknown'
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Merge configured teacher result types with any distinct values found in Result rows.
 * Keeps UI data-driven (no hardcoded mid/EOT/class-only tabs in pages).
 * @param {string[]} [dbTypes]
 * @returns {{ value: string, label: string }[]}
 */
export function listTrackedResultTypes(dbTypes = []) {
  const map = new Map()
  for (const t of TEACHER_ENTRY_RESULT_TYPES) {
    map.set(t, { value: t, label: getResultTypeLabel(t) })
  }
  for (const raw of dbTypes || []) {
    const key = String(raw || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
    if (!key || map.has(key)) continue
    map.set(key, { value: key, label: getResultTypeLabel(key) })
  }
  return Array.from(map.values())
}

export function isSchoolWideResultType(value) {
  return SCHOOL_WIDE_RESULT_TYPES.includes(normalizeResultType(value))
}
