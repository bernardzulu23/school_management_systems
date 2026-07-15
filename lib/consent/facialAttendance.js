/**
 * Facial-recognition attendance — consent & data minimization (Prompt 22 / ZDPA).
 *
 * Storage: Student.faceEmbedding is a derived float vector (JSON), never a raw photo.
 * Capture UIs must discard camera frames after embedding extraction.
 *
 * Enforcement points (call these — do not rely on UI alone):
 *   - assertSchoolFacialAttendanceEnabled  → school gate
 *   - hasActiveFacialConsent / filterRosterEmbeddingsByConsent → match + enroll
 *   - assertMayUseFaceMethod → AttendanceMark method=FACE
 *   - clearFaceEmbeddingForPupil → withdraw / leave / retention
 */

import prisma from '@/lib/prisma'

export const CONSENT_TYPE_FACIAL = 'FACIAL_RECOGNITION'
export const ENROLLMENT_ACTIVE = 'ACTIVE'
export const LEFT_STATUSES = new Set(['WITHDRAWN', 'GRADUATED', 'TRANSFERRED'])

export function isFacialAttendanceEnabled(school) {
  return school?.facialAttendanceEnabled === true
}

/**
 * @returns {Promise<{ enabled: boolean, retentionDays: number }>}
 */
export async function getSchoolFacialPolicy(schoolId, db = prisma) {
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { facialAttendanceEnabled: true, faceEmbeddingRetentionDays: true },
  })
  return {
    enabled: isFacialAttendanceEnabled(school),
    retentionDays: Math.max(0, Number(school?.faceEmbeddingRetentionDays) || 365),
  }
}

export async function assertSchoolFacialAttendanceEnabled(schoolId, db = prisma) {
  const policy = await getSchoolFacialPolicy(schoolId, db)
  if (!policy.enabled) {
    const err = new Error(
      'Facial recognition attendance is not enabled for this school. Use manual marking.'
    )
    err.code = 'FACIAL_ATTENDANCE_DISABLED'
    err.status = 403
    throw err
  }
  return policy
}

/**
 * Latest FACIAL_RECOGNITION row that is GRANTED and not withdrawn.
 */
export async function hasActiveFacialConsent(schoolId, pupilId, db = prisma) {
  if (!schoolId || !pupilId) return false
  const row = await db.consentRecord.findFirst({
    where: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      withdrawnAt: null,
    },
    select: { id: true },
    orderBy: { grantedAt: 'desc' },
  })
  return Boolean(row)
}

export async function assertActiveFacialConsent(schoolId, pupilId, db = prisma) {
  const ok = await hasActiveFacialConsent(schoolId, pupilId, db)
  if (!ok) {
    const err = new Error(
      'No active parental/guardian consent for facial recognition. Mark this pupil manually.'
    )
    err.code = 'FACIAL_CONSENT_REQUIRED'
    err.status = 403
    throw err
  }
}

/**
 * Strip or null embeddings for pupils without active consent (data minimization in transit).
 * @param {string} schoolId
 * @param {Array<{ id: string, faceEmbedding?: string|null }>} roster
 */
export async function filterRosterEmbeddingsByConsent(schoolId, roster, db = prisma) {
  const list = Array.isArray(roster) ? roster : []
  if (!list.length) return list

  const withEmbed = list.filter((s) => s?.faceEmbedding)
  if (!withEmbed.length) {
    return list.map((s) => ({ ...s, hasFacialConsent: false, faceEmbedding: null }))
  }

  const consented = await db.consentRecord.findMany({
    where: {
      schoolId,
      pupilId: { in: withEmbed.map((s) => s.id) },
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      withdrawnAt: null,
    },
    select: { pupilId: true },
  })
  const allow = new Set(consented.map((c) => c.pupilId))

  return list.map((s) => {
    const ok = allow.has(s.id)
    return {
      ...s,
      hasFacialConsent: ok,
      faceEmbedding: ok ? s.faceEmbedding : null,
    }
  })
}

export async function assertMayUseFaceMethod(schoolId, studentId, db = prisma) {
  await assertSchoolFacialAttendanceEnabled(schoolId, db)
  await assertActiveFacialConsent(schoolId, studentId, db)
}

/**
 * Null embedding only — never stores raw images. Safe to call on withdraw / leave / retention.
 */
export async function clearFaceEmbeddingForPupil(pupilId, schoolId, db = prisma) {
  if (!pupilId) return
  await db.student.updateMany({
    where: schoolId ? { id: pupilId, schoolId } : { id: pupilId },
    data: { faceEmbedding: null, faceEmbeddingEnrolledAt: null },
  })
}

/**
 * When enrollmentStatus leaves ACTIVE, drop biometric template immediately.
 */
export async function onStudentEnrollmentStatusChange({
  schoolId,
  pupilId,
  previousStatus,
  nextStatus,
  db = prisma,
}) {
  const prev = String(previousStatus || ENROLLMENT_ACTIVE).toUpperCase()
  const next = String(nextStatus || ENROLLMENT_ACTIVE).toUpperCase()
  if (prev === next) return { cleared: false }
  if (LEFT_STATUSES.has(next) || next !== ENROLLMENT_ACTIVE) {
    await clearFaceEmbeddingForPupil(pupilId, schoolId, db)
    return { cleared: true, reason: 'enrollment_status' }
  }
  return { cleared: false }
}

/**
 * Retention backstop for ACTIVE pupils whose embedding is older than school policy.
 * @returns {Promise<number>} number of embeddings cleared
 */
export async function purgeExpiredFaceEmbeddings(schoolId, db = prisma) {
  const policy = await getSchoolFacialPolicy(schoolId, db)
  const days = policy.retentionDays
  if (!days || days <= 0) return 0

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result = await db.student.updateMany({
    where: {
      schoolId,
      faceEmbedding: { not: null },
      OR: [
        { faceEmbeddingEnrolledAt: { lt: cutoff } },
        { faceEmbeddingEnrolledAt: null, updatedAt: { lt: cutoff } },
      ],
    },
    data: { faceEmbedding: null, faceEmbeddingEnrolledAt: null },
  })
  return result.count
}

/**
 * Clear embeddings that lack an active consent record (defensive / post-withdraw).
 */
export async function purgeFaceEmbeddingsWithoutConsent(schoolId, db = prisma) {
  const withFace = await db.student.findMany({
    where: {
      schoolId,
      faceEmbedding: { not: null },
    },
    select: { id: true },
  })
  if (!withFace.length) return 0

  const consented = await db.consentRecord.findMany({
    where: {
      schoolId,
      pupilId: { in: withFace.map((s) => s.id) },
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      withdrawnAt: null,
    },
    select: { pupilId: true },
  })
  const allow = new Set(consented.map((c) => c.pupilId))
  const revokeIds = withFace.filter((s) => !allow.has(s.id)).map((s) => s.id)
  if (!revokeIds.length) return 0

  await db.student.updateMany({
    where: { id: { in: revokeIds }, schoolId },
    data: { faceEmbedding: null, faceEmbeddingEnrolledAt: null },
  })
  return revokeIds.length
}

/** Validate enrollment payload is a numeric vector, not an image blob. */
export function sanitizeFaceEmbeddingPayload(embedding) {
  let value = embedding
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^data:image\//i.test(trimmed) || trimmed.length > 50_000) {
      const err = new Error('Raw images are not accepted. Send a derived embedding vector only.')
      err.code = 'RAW_IMAGE_REJECTED'
      err.status = 400
      throw err
    }
    try {
      value = JSON.parse(trimmed)
    } catch {
      const err = new Error('embedding must be a JSON array of numbers')
      err.code = 'INVALID_EMBEDDING'
      err.status = 400
      throw err
    }
  }
  if (!Array.isArray(value) || !value.length) {
    const err = new Error('embedding must be a non-empty number array')
    err.code = 'INVALID_EMBEDDING'
    err.status = 400
    throw err
  }
  const nums = value.map(Number).filter((n) => Number.isFinite(n))
  if (nums.length !== value.length) {
    const err = new Error('embedding must contain only finite numbers')
    err.code = 'INVALID_EMBEDDING'
    err.status = 400
    throw err
  }
  if (nums.length > 512) {
    const err = new Error('embedding dimension too large')
    err.code = 'INVALID_EMBEDDING'
    err.status = 400
    throw err
  }
  return JSON.stringify(nums)
}
