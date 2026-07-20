/**
 * Exam levels for ECZ-style practice paper generation (all Zambian grades/forms).
 * Grades 8–9 are phased out under the 2023 CBC — not offered for new work; legacy values remain for labels/history.
 */

/** Recognized for display and read APIs only (not selectable for new exams). */
export const LEGACY_ECZ_EXAM_LEVELS = [
  { value: 'grade8', label: 'Grade 8' },
  { value: 'grade9', label: 'Grade 9' },
]

export const ECZ_PRACTICE_EXAM_LEVEL_GROUPS = [
  {
    label: 'Primary (Grades 1–7)',
    levels: [
      { value: 'grade1', label: 'Grade 1' },
      { value: 'grade2', label: 'Grade 2' },
      { value: 'grade3', label: 'Grade 3' },
      { value: 'grade4', label: 'Grade 4' },
      { value: 'grade5', label: 'Grade 5' },
      { value: 'grade6', label: 'Grade 6' },
      { value: 'grade7', label: 'Grade 7' },
    ],
  },
  {
    label: 'Senior Secondary (Grades 10–12)',
    levels: [
      { value: 'grade10', label: 'Grade 10' },
      { value: 'grade11', label: 'Grade 11' },
      { value: 'grade12', label: 'Grade 12 (School Certificate)' },
    ],
  },
  {
    label: 'Secondary — Forms 1–6',
    levels: [
      { value: 'form1', label: 'Form 1' },
      { value: 'form2', label: 'Form 2' },
      { value: 'form3', label: 'Form 3' },
      { value: 'form4', label: 'Form 4' },
      { value: 'form5', label: 'Form 5' },
      { value: 'form6', label: 'Form 6' },
    ],
  },
]

export const ECZ_PRACTICE_EXAM_LEVELS = ECZ_PRACTICE_EXAM_LEVEL_GROUPS.flatMap((g) => g.levels)

export const ALL_ECZ_EXAM_LEVELS = [...ECZ_PRACTICE_EXAM_LEVELS, ...LEGACY_ECZ_EXAM_LEVELS]

const LEVEL_LABELS = Object.fromEntries(ALL_ECZ_EXAM_LEVELS.map((l) => [l.value, l.label]))

/** Map phased-out junior grades to equivalent Form levels for new student work. */
const LEGACY_TO_SELECTABLE = {
  grade8: 'form1',
  grade9: 'form2',
}

/** Normalize API/form values like "Grade 12" → grade12 */
export function normalizeEczExamLevel(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  if (!raw) return 'form1'
  if (LEVEL_LABELS[raw]) return raw
  const match = raw.match(/^(grade|form)(\d{1,2})$/)
  if (match) return `${match[1]}${match[2]}`
  return raw
}

/** Pick a selectable exam level (defaults legacy G8/G9 → Form 1/2). */
export function resolveSelectableEczExamLevel(value) {
  const key = normalizeEczExamLevel(value)
  if (LEGACY_TO_SELECTABLE[key]) return LEGACY_TO_SELECTABLE[key]
  if (isValidEczExamLevel(key)) return key
  return 'form1'
}

export function formatEczExamLevelLabel(value) {
  const key = normalizeEczExamLevel(value)
  return LEVEL_LABELS[key] || String(value || key)
}

export function isValidEczExamLevel(value) {
  return ECZ_PRACTICE_EXAM_LEVELS.some((l) => l.value === normalizeEczExamLevel(value))
}

export function isKnownEczExamLevel(value) {
  return ALL_ECZ_EXAM_LEVELS.some((l) => l.value === normalizeEczExamLevel(value))
}
