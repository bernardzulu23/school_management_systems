/**
 * School-Based Assessment (secondary) constants.
 *
 * SBA_ENTRY_START_YEAR: school mark entry begins academic year 2026.
 * SBA_START_LEVEL_SOURCE: TBD (unconfirmed ECZ-wide vs school policy) —
 *   seeded startsAtLevel is Form 2 pending confirmation.
 * CBC_SBA_SOURCE_DOCUMENT: PENDING — do not invent CBC component max marks.
 * LOCK_ROLE_REQUIREMENT: HOD / headteacher / admin (lesson-plan approve pattern).
 */

export const SBA_ENTRY_START_YEAR = 2026

/** Default policy start level until SBA_START_LEVEL_SOURCE is confirmed. */
export const SBA_DEFAULT_STARTS_AT_LEVEL = 'Form 2'

export const SBA_START_LEVEL_SOURCE = 'TBD (unconfirmed ECZ vs school policy)'

export const CBC_SBA_SOURCE_DOCUMENT = 'CBC SBA Guidelines — PENDING'

export const LOCK_ROLE_REQUIREMENT = [
  'HOD',
  'hod',
  'headteacher',
  'ADMIN',
  'admin',
  'administrator',
]

export function assertSbaEntryYear(academicYear) {
  const year = Number(academicYear)
  if (!Number.isFinite(year) || year < SBA_ENTRY_START_YEAR) {
    const err = new Error(`SBA recording begins in academic year ${SBA_ENTRY_START_YEAR}`)
    err.code = 'SBA_ENTRY_YEAR'
    err.status = 400
    throw err
  }
  return year
}
