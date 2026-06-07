import { generateEnrollmentCode } from '@/lib/utils/enrollment-code'

export function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Create a new single-use invite and mirror it on School.enrollmentCode for display.
 */
export async function createEnrollmentInvite(tx, schoolId, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateEnrollmentCode()
    try {
      const invite = await tx.enrollmentInvite.create({
        data: { schoolId, code },
      })
      await tx.school.update({
        where: { id: schoolId },
        data: { enrollmentCode: code },
      })
      return invite
    } catch (e) {
      if (String(e?.code) === 'P2002' && attempt < maxAttempts - 1) continue
      throw e
    }
  }
  throw new Error('Failed to generate enrollment invite')
}

export async function findUnusedEnrollmentInvite(db, code) {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return null

  return db.enrollmentInvite.findFirst({
    where: {
      code: { equals: normalized, mode: 'insensitive' },
      usedAt: null,
    },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          subdomain: true,
          schoolType: true,
          active: true,
          plan: true,
        },
      },
    },
  })
}

export async function consumeEnrollmentInvite(tx, inviteId, userId) {
  const result = await tx.enrollmentInvite.updateMany({
    where: { id: inviteId, usedAt: null },
    data: {
      usedAt: new Date(),
      usedByUserId: userId,
    },
  })

  if (result.count !== 1) {
    const err = new Error('Enrollment code has already been used')
    err.code = 'INVITE_ALREADY_USED'
    throw err
  }
}

export async function countUnusedInvites(db, schoolId) {
  return db.enrollmentInvite.count({
    where: { schoolId, usedAt: null },
  })
}

export async function getLatestUnusedInvite(db, schoolId) {
  return db.enrollmentInvite.findFirst({
    where: { schoolId, usedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { code: true, createdAt: true },
  })
}
