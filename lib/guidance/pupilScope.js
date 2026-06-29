import { normalizeGradeLevel } from '@/lib/gradingSystem'

const SENIOR_KEYS = new Set(['grade10', 'grade11', 'grade12', 'form5', 'form6'])
const JUNIOR_KEYS = new Set(['form1', 'form2', 'form3', 'form4'])

/**
 * @param {string} classLabel
 * @returns {'JUNIOR' | 'SENIOR' | 'UNKNOWN'}
 */
export function pupilGradeBand(classLabel) {
  const raw = String(classLabel || '')
    .trim()
    .toLowerCase()
  if (!raw) return 'UNKNOWN'

  const key = normalizeGradeLevel(classLabel)
  if (key && SENIOR_KEYS.has(key)) return 'SENIOR'
  if (key && JUNIOR_KEYS.has(key)) return 'JUNIOR'

  const primaryGrade = raw.match(/\bgrade\s*([1-9]|1[0-2])\b/)
  if (primaryGrade) {
    const n = Number(primaryGrade[1])
    return n >= 10 ? 'SENIOR' : 'JUNIOR'
  }

  return 'UNKNOWN'
}

/**
 * @param {string} classLabel
 * @param {'ALL' | 'JUNIOR' | 'SENIOR'} scope
 */
export function matchesGuidanceScope(classLabel, scope) {
  const normalized = String(scope || 'ALL').toUpperCase()
  if (normalized === 'ALL') return true
  const band = pupilGradeBand(classLabel)
  if (band === 'UNKNOWN') return true
  if (normalized === 'JUNIOR') return band === 'JUNIOR'
  if (normalized === 'SENIOR') return band === 'SENIOR'
  return true
}
