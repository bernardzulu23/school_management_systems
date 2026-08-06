/**
 * Pupil data minimization (Phase 5 M1) — allowlists for API responses.
 * Never expose biometrics, PIN hashes, or medical/guardian-address by default.
 */

/** Prisma `select` for class roster / list endpoints (no PII-sensitive columns). */
export const PUPIL_ROSTER_SELECT = {
  id: true,
  name: true,
  class: true,
  classId: true,
  exam_number: true,
  schoolId: true,
  twinGroupId: true,
  requiresSecondaryAuth: true,
  secondaryAuthMethod: true,
  enrollmentStatus: true,
  grade_average: true,
  selected_subjects: true,
  userId: true,
  previous_school: true,
  createdAt: true,
  updatedAt: true,
}

/** Extra select when face attendance needs embeddings (still omit medical/PIN). */
export const PUPIL_ROSTER_FACE_SELECT = {
  ...PUPIL_ROSTER_SELECT,
  faceEmbedding: true,
}

/** Staff list include shape — user public fields only. */
export const PUPIL_LIST_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  profile_picture_url: true,
  contact_number: true,
  gender: true,
}

const ALWAYS_STRIP = new Set([
  'pinHash',
  'password',
  'hash',
  'salt',
  'secret',
  'token',
  'resetToken',
  'resetTokenExpiry',
])

const MEDICAL_KEYS = new Set([
  'blood_type',
  'medical_aid_scheme',
  'medical_aid_number',
  'family_doctor_name',
  'family_doctor_contact',
  'medical_conditions',
  'allergies',
  'medications',
])

const ADDRESS_KEYS = new Set(['guardian_address', 'emergency_contact_address'])

const GUARDIAN_CONTACT_KEYS = new Set([
  'parent_father_name',
  'parent_father_contact',
  'parent_father_email',
  'parent_mother_name',
  'parent_mother_contact',
  'parent_mother_email',
  'guardian_name',
  'guardian_contact',
  'guardian_email',
  'guardian_relationship',
  'emergency_contact_name',
  'emergency_contact_phone',
  'emergency_contact_relationship',
])

/**
 * @param {object|null|undefined} student
 * @param {{
 *   includeFace?: boolean
 *   includeMedical?: boolean
 *   includeGuardianContacts?: boolean
 *   includeAddresses?: boolean
 * }} [opts]
 */
export function toSafePupilDto(student, opts = {}) {
  if (!student || typeof student !== 'object') return student

  const includeFace = Boolean(opts.includeFace)
  const includeMedical = Boolean(opts.includeMedical)
  const includeGuardianContacts = opts.includeGuardianContacts !== false
  const includeAddresses = Boolean(opts.includeAddresses ?? includeMedical)

  const out = {}
  for (const [key, value] of Object.entries(student)) {
    const lower = key.toLowerCase()
    if (ALWAYS_STRIP.has(key) || ALWAYS_STRIP.has(lower)) continue
    if (!includeFace && key === 'faceEmbedding') continue
    if (!includeMedical && MEDICAL_KEYS.has(key)) continue
    if (!includeAddresses && ADDRESS_KEYS.has(key)) continue
    if (!includeGuardianContacts && GUARDIAN_CONTACT_KEYS.has(key)) continue

    if (key === 'user' && value && typeof value === 'object') {
      const { password, hash, salt, resetToken, resetTokenExpiry, ...safeUser } = value
      out.user = safeUser
      continue
    }
    out[key] = value
  }
  return out
}

/**
 * Minimal roster row for class lists.
 * @param {object} student
 * @param {{ currentScore?: unknown, faceEmbedding?: string|null }} [extra]
 */
export function toRosterPupilDto(student, extra = {}) {
  if (!student) return student
  const row = {
    id: student.id,
    name: student.name,
    class: student.class,
    classId: student.classId ?? null,
    exam_number: student.exam_number ?? null,
    schoolId: student.schoolId,
    twinGroupId: student.twinGroupId ?? null,
    requiresSecondaryAuth: Boolean(student.requiresSecondaryAuth),
    secondaryAuthMethod: student.secondaryAuthMethod ?? null,
    enrollmentStatus: student.enrollmentStatus ?? 'ACTIVE',
    currentScore: extra.currentScore !== undefined ? extra.currentScore : null,
  }
  if (extra.faceEmbedding !== undefined) {
    row.faceEmbedding = extra.faceEmbedding
  }
  return row
}

/** Keys considered sensitive for PII access logging. */
export const PII_FIELD_GROUPS = {
  medical: [...MEDICAL_KEYS],
  guardian: [
    'guardian_contact',
    'parent_father_contact',
    'parent_mother_contact',
    'guardian_address',
    'emergency_contact_phone',
  ],
  biometric: ['faceEmbedding', 'pinHash'],
}
