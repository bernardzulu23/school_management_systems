/**
 * Consent ledger service — grant / deny / withdraw facial recognition consent.
 */
import prisma from '@/lib/prisma'
import {
  CONSENT_TYPE_FACIAL,
  clearFaceEmbeddingForPupil,
  purgeFaceEmbeddingsWithoutConsent,
  purgeExpiredFaceEmbeddings,
} from '@/lib/consent/facialAttendance'
import { loadGuardiansByStudentIds, resolveStudentGuardian } from '@/lib/consent/studentGuardians'
import { recordChangeLog, actorFromUser } from '@/lib/changelog/record'
import { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } from '@/lib/changelog/constants'

const METHODS = new Set(['IN_APP', 'PAPER_FORM', 'DIGITIZED', 'VERBAL_WITH_WITNESS', 'OTHER'])

function normalizeMethod(raw) {
  const m = String(raw || 'PAPER_FORM')
    .trim()
    .toUpperCase()
  return METHODS.has(m) ? m : 'PAPER_FORM'
}

async function logConsent(schoolId, actorUser, action, record, summaryExtra = '') {
  const a = actorFromUser(actorUser)
  await recordChangeLog({
    schoolId,
    actor: a,
    action,
    module: CHANGE_LOG_MODULES.PRIVACY,
    entityType: 'ConsentRecord',
    entityId: record.id,
    entityLabel: `Facial consent — pupil ${record.pupilId}`,
    summary: `${buildActorLabel(a)} ${summaryExtra}`.trim(),
    after: {
      consentType: record.consentType,
      status: record.status,
      pupilId: record.pupilId,
      method: record.method,
      grantedByName: record.grantedByName,
      grantedByRelationship: record.grantedByRelationship,
      withdrawnAt: record.withdrawnAt,
    },
    metadata: { pupilId: record.pupilId, consentType: record.consentType },
  })
}

/**
 * Resolve grant/deny party from DB-linked guardian (preferred) or legacy free-text fields.
 * New UI always sends guardianId; free-text is rejected when guardianId is absent.
 */
async function resolveGrantedByFields({
  schoolId,
  pupilId,
  guardianId,
  grantedByName,
  grantedByRelationship,
  grantedByContact,
  allowLegacyFreeText = false,
}) {
  if (guardianId) {
    const g = await resolveStudentGuardian(schoolId, pupilId, guardianId)
    return {
      grantedByName: g.name,
      grantedByRelationship: g.relationship,
      grantedByContact: g.contact || null,
      parentUserId: g.parentUserId || null,
      parentLinkId: g.parentLinkId || null,
      guardianSource: g.source,
    }
  }

  if (!allowLegacyFreeText) {
    const err = new Error(
      'Select a parent/guardian linked to this student (details must come from student records)'
    )
    err.status = 400
    throw err
  }

  const name = String(grantedByName || '').trim()
  const relationship = String(grantedByRelationship || '').trim()
  if (!name || !relationship) {
    const err = new Error('Parent/guardian name and relationship are required')
    err.status = 400
    throw err
  }
  return {
    grantedByName: name,
    grantedByRelationship: relationship,
    grantedByContact: grantedByContact ? String(grantedByContact).trim() : null,
    parentUserId: null,
    parentLinkId: null,
    guardianSource: 'legacy',
  }
}

function appendGuardianAuditNote(notes, resolved) {
  const base = notes ? String(notes).trim() : ''
  const bits = []
  if (resolved.parentUserId) bits.push(`parentUserId=${resolved.parentUserId}`)
  if (resolved.parentLinkId) bits.push(`parentLinkId=${resolved.parentLinkId}`)
  if (resolved.guardianSource) bits.push(`source=${resolved.guardianSource}`)
  if (bits.length === 0) return base || null
  const audit = `[guardian ${bits.join(' ')}]`
  return base ? `${base}\n${audit}` : audit
}

/**
 * Grant facial consent (paper form or in-app). Supersedes prior GRANTED by withdrawing them.
 */
export async function grantFacialConsent({
  schoolId,
  pupilId,
  guardianId,
  grantedByName,
  grantedByRelationship,
  grantedByContact,
  method = 'PAPER_FORM',
  notes,
  actorUser,
  grantedAt = new Date(),
}) {
  const resolved = await resolveGrantedByFields({
    schoolId,
    pupilId,
    guardianId,
    grantedByName,
    grantedByRelationship,
    grantedByContact,
  })

  const pupil = await prisma.student.findFirst({
    where: { id: pupilId, schoolId },
    select: { id: true, name: true },
  })
  if (!pupil) {
    const err = new Error('Student not found')
    err.status = 404
    throw err
  }

  const now = new Date()
  await prisma.consentRecord.updateMany({
    where: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      withdrawnAt: null,
    },
    data: { status: 'WITHDRAWN', withdrawnAt: now },
  })

  const record = await prisma.consentRecord.create({
    data: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      grantedByName: resolved.grantedByName,
      grantedByRelationship: resolved.grantedByRelationship,
      grantedByContact: resolved.grantedByContact,
      grantedAt: grantedAt ? new Date(grantedAt) : now,
      method: normalizeMethod(method),
      notes: appendGuardianAuditNote(notes, resolved),
      recordedByUserId: actorUser?.id || null,
    },
  })

  await logConsent(
    schoolId,
    actorUser,
    CHANGE_LOG_ACTIONS.RECORDED,
    record,
    `recorded facial-recognition consent for ${pupil.name} (granted by ${resolved.grantedByName}, ${resolved.grantedByRelationship})`
  )
  return record
}

export async function denyFacialConsent({
  schoolId,
  pupilId,
  guardianId,
  grantedByName,
  grantedByRelationship,
  grantedByContact,
  method = 'PAPER_FORM',
  notes,
  actorUser,
}) {
  const resolved = await resolveGrantedByFields({
    schoolId,
    pupilId,
    guardianId,
    grantedByName,
    grantedByRelationship,
    grantedByContact,
  })

  const pupil = await prisma.student.findFirst({
    where: { id: pupilId, schoolId },
    select: { id: true, name: true },
  })
  if (!pupil) {
    const err = new Error('Student not found')
    err.status = 404
    throw err
  }

  await prisma.consentRecord.updateMany({
    where: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      withdrawnAt: null,
    },
    data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
  })

  const record = await prisma.consentRecord.create({
    data: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'DENIED',
      grantedByName: resolved.grantedByName,
      grantedByRelationship: resolved.grantedByRelationship,
      grantedByContact: resolved.grantedByContact,
      grantedAt: new Date(),
      method: normalizeMethod(method),
      notes: appendGuardianAuditNote(notes, resolved),
      recordedByUserId: actorUser?.id || null,
    },
  })

  await clearFaceEmbeddingForPupil(pupilId, schoolId)
  await logConsent(
    schoolId,
    actorUser,
    CHANGE_LOG_ACTIONS.RECORDED,
    record,
    `recorded facial-recognition refusal for ${pupil.name}`
  )
  return record
}

export async function withdrawFacialConsent({
  schoolId,
  pupilId,
  notes,
  actorUser,
  withdrawnByName,
  withdrawnByRelationship,
}) {
  const pupil = await prisma.student.findFirst({
    where: { id: pupilId, schoolId },
    select: { id: true, name: true },
  })
  if (!pupil) {
    const err = new Error('Student not found')
    err.status = 404
    throw err
  }

  const now = new Date()
  const updated = await prisma.consentRecord.updateMany({
    where: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'GRANTED',
      withdrawnAt: null,
    },
    data: {
      status: 'WITHDRAWN',
      withdrawnAt: now,
      notes: notes ? String(notes).trim() : undefined,
    },
  })

  await clearFaceEmbeddingForPupil(pupilId, schoolId)

  const record = await prisma.consentRecord.create({
    data: {
      schoolId,
      pupilId,
      consentType: CONSENT_TYPE_FACIAL,
      status: 'WITHDRAWN',
      grantedByName: String(withdrawnByName || 'Parent/guardian').trim(),
      grantedByRelationship: String(withdrawnByRelationship || 'guardian').trim(),
      grantedAt: now,
      withdrawnAt: now,
      method: 'PAPER_FORM',
      notes: notes ? String(notes).trim() : null,
      recordedByUserId: actorUser?.id || null,
    },
  })

  await logConsent(
    schoolId,
    actorUser,
    CHANGE_LOG_ACTIONS.UPDATED,
    record,
    `withdrew facial-recognition consent for ${pupil.name} (cleared face template; prior grants closed: ${updated.count})`
  )
  return record
}

export async function listFacialConsentForSchool(schoolId, { classId, q } = {}) {
  await purgeExpiredFaceEmbeddings(schoolId).catch(() => 0)
  await purgeFaceEmbeddingsWithoutConsent(schoolId).catch(() => 0)

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { exam_number: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      class: true,
      classId: true,
      enrollmentStatus: true,
      faceEmbedding: true,
      faceEmbeddingEnrolledAt: true,
    },
    orderBy: [{ class: 'asc' }, { name: 'asc' }],
    take: 500,
  })

  const ids = students.map((s) => s.id)
  const [consents, guardiansByStudent] = await Promise.all([
    ids.length
      ? prisma.consentRecord.findMany({
          where: { schoolId, pupilId: { in: ids }, consentType: CONSENT_TYPE_FACIAL },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    loadGuardiansByStudentIds(schoolId, ids),
  ])

  const latestByPupil = new Map()
  const activeByPupil = new Map()
  for (const c of consents) {
    if (!latestByPupil.has(c.pupilId)) latestByPupil.set(c.pupilId, c)
    if (c.status === 'GRANTED' && !c.withdrawnAt && !activeByPupil.has(c.pupilId)) {
      activeByPupil.set(c.pupilId, c)
    }
  }

  return students.map((s) => {
    const active = activeByPupil.get(s.id) || null
    const latest = latestByPupil.get(s.id) || null
    const guardians = guardiansByStudent.get(s.id) || []
    return {
      studentId: s.id,
      name: s.name,
      class: s.class,
      classId: s.classId,
      enrollmentStatus: s.enrollmentStatus,
      hasFaceTemplate: Boolean(s.faceEmbedding),
      faceEmbeddingEnrolledAt: s.faceEmbeddingEnrolledAt,
      hasActiveConsent: Boolean(active),
      activeConsent: active,
      latestConsent: latest,
      guardians,
      hasLinkedGuardian: guardians.length > 0,
    }
  })
}

export async function setSchoolFacialAttendanceSettings({
  schoolId,
  facialAttendanceEnabled,
  faceEmbeddingRetentionDays,
  actorUser,
}) {
  const before = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { facialAttendanceEnabled: true, faceEmbeddingRetentionDays: true, name: true },
  })
  if (!before) {
    const err = new Error('School not found')
    err.status = 404
    throw err
  }

  const data = {}
  if (facialAttendanceEnabled != null)
    data.facialAttendanceEnabled = Boolean(facialAttendanceEnabled)
  if (faceEmbeddingRetentionDays != null) {
    const days = Math.floor(Number(faceEmbeddingRetentionDays))
    if (!Number.isFinite(days) || days < 0 || days > 3650) {
      const err = new Error('faceEmbeddingRetentionDays must be 0–3650')
      err.status = 400
      throw err
    }
    data.faceEmbeddingRetentionDays = days
  }

  const after = await prisma.school.update({
    where: { id: schoolId },
    data,
    select: { facialAttendanceEnabled: true, faceEmbeddingRetentionDays: true },
  })

  const a = actorFromUser(actorUser)
  await recordChangeLog({
    schoolId,
    actor: a,
    action: CHANGE_LOG_ACTIONS.UPDATED,
    module: CHANGE_LOG_MODULES.PRIVACY,
    entityType: 'School',
    entityId: schoolId,
    entityLabel: before.name || 'School',
    summary: `${buildActorLabel(a)} updated facial attendance policy (enabled=${after.facialAttendanceEnabled}, retentionDays=${after.faceEmbeddingRetentionDays})`,
    before,
    after,
    changedFields: Object.keys(data),
  })

  if (!after.facialAttendanceEnabled) {
    // Feature off: leave templates only if consent remains; still strip orphans.
    await purgeFaceEmbeddingsWithoutConsent(schoolId).catch(() => 0)
  }

  return after
}
