import { normalizeStudentGender } from '@/lib/government/genderReport'

/** @returns {'male'|'female'|'mixed'} */
export function normalizeRoomGender(value) {
  const g = String(value || '')
    .trim()
    .toLowerCase()
  if (g === 'male' || g === 'm') return 'male'
  if (g === 'female' || g === 'f') return 'female'
  return 'mixed'
}

/**
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function checkHostelGenderMatch({ studentGender, roomGender }) {
  const room = normalizeRoomGender(roomGender)
  if (room === 'mixed') return { ok: true }

  const student = normalizeStudentGender(studentGender)
  if (student === 'Unknown') {
    return {
      ok: false,
      code: 'HOSTEL_GENDER_UNKNOWN',
      message: 'Record student gender before assigning to a gender-specific dormitory.',
    }
  }

  const studentRoom = student === 'Male' ? 'male' : student === 'Female' ? 'female' : 'unknown'
  if (studentRoom !== room) {
    const label = room === 'male' ? 'male' : 'female'
    return {
      ok: false,
      code: 'HOSTEL_GENDER_MISMATCH',
      message: `This dormitory is for ${label} boarders only.`,
    }
  }

  return { ok: true }
}

export function assertHostelGenderMatch({ studentGender, roomGender }) {
  const result = checkHostelGenderMatch({ studentGender, roomGender })
  if (!result.ok) {
    const err = new Error(result.message)
    err.code = result.code
    throw err
  }
}
