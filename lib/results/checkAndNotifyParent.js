import prisma from '@/lib/prisma'
import { buildTermResultsCompleteSmsMessage, getSchoolSmsFrom, sendSchoolSms } from '@/lib/sms'
import { normalizePhoneNumbers } from '@/lib/sms/normalizePhone'
import { RESULT_TYPES } from '@/lib/results/resultTypes'
import { safeCompositeKey } from '@/lib/security/safeQueryValue'

/** Stuck smsSending locks older than this may be retried. */
export const SMS_SENDING_LOCK_TTL_MS = 15 * 60 * 1000

export function extractParentContacts(student) {
  const raw = [
    student?.guardian_contact,
    student?.parent_father_contact,
    student?.parent_mother_contact,
  ]
  // Always store/send E.164 (+260…) even when DB still has 10-digit local form
  return normalizePhoneNumbers(raw)
}

export function countFinalizedEnrolledSubjects(enrolledSubjectIds, results) {
  const enrolled = new Set(
    (enrolledSubjectIds || []).map((id) => String(id || '').trim()).filter(Boolean)
  )
  if (enrolled.size === 0) return { subjectsEnrolled: 0, subjectsFinalized: 0, isComplete: false }

  const finalized = new Set(
    (results || [])
      .filter(
        (r) =>
          String(r.workflowStatus || '')
            .trim()
            .toLowerCase() === 'finalized'
      )
      .map((r) => String(r.subjectId || '').trim())
      .filter((id) => enrolled.has(id))
  )

  return {
    subjectsEnrolled: enrolled.size,
    subjectsFinalized: finalized.size,
    isComplete: finalized.size >= enrolled.size,
  }
}

/**
 * True when smsSending is held but smsSentAt is still null and the last attempt
 * is older than the TTL (or missing) — allows retry after a crash mid-send.
 */
export function isSmsSendingLockStale(status, now = new Date(), ttlMs = SMS_SENDING_LOCK_TTL_MS) {
  if (!status?.smsSending) return false
  if (status?.smsSentAt) return false
  const attemptedRaw = status?.smsLastAttemptAt
  if (!attemptedRaw) return true
  const attempted = new Date(attemptedRaw).getTime()
  if (Number.isNaN(attempted)) return true
  return now.getTime() - attempted >= ttlMs
}

function uniqueSubjectIds(ids) {
  return Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)))
}

/**
 * Resolve subject IDs that must be finalized before term-complete SMS.
 * Cascade: pupilSubjectEnrollment → selected_subjects (name match) → class.subjects.
 */
export async function resolveEnrolledSubjectIds({ schoolId, studentId, classId, student, tx }) {
  const enrollments = await tx.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: studentId, classId },
    select: { subjectId: true },
    take: 50000,
  })
  const fromEnrollments = uniqueSubjectIds((enrollments || []).map((e) => e.subjectId))
  if (fromEnrollments.length > 0) return fromEnrollments

  const selectedNames = (student?.selected_subjects || [])
    .map((n) => String(n || '').trim())
    .filter(Boolean)
  if (selectedNames.length > 0) {
    const nameSet = new Set(selectedNames.map((n) => n.toLowerCase()))
    const subjects = await tx.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
      take: 50000,
    })
    const fromSelected = uniqueSubjectIds(
      (subjects || [])
        .filter((s) =>
          nameSet.has(
            String(s.name || '')
              .trim()
              .toLowerCase()
          )
        )
        .map((s) => s.id)
    )
    if (fromSelected.length > 0) return fromSelected
  }

  const cls = await tx.class.findFirst({
    where: { id: classId, schoolId },
    select: { subjects: { select: { id: true } } },
  })
  return uniqueSubjectIds((cls?.subjects || []).map((s) => s.id))
}

/**
 * After saving end-of-term results, notify the parent when every enrolled subject
 * has a finalized result for the term/year.
 */
export async function checkAndNotifyParent({
  schoolId,
  studentId,
  classId,
  term,
  year,
  request,
  prismaClient = prisma,
}) {
  const now = new Date()
  const keyRaw = safeCompositeKey({ schoolId, studentId, term, year })
  if (!keyRaw) return
  const yearInt = Number(keyRaw.year)
  if (!Number.isFinite(yearInt)) return
  const key = { ...keyRaw, year: yearInt }

  const school = await prismaClient.school.findFirst({
    where: { id: schoolId },
    select: { name: true, subdomain: true, domain: true },
  })

  const prepared = await prismaClient.$transaction(async (tx) => {
    const existingStatus = await tx.resultsStatus.upsert({
      where: { schoolId_studentId_term_year: key },
      create: { ...key },
      update: { lastEvaluatedAt: now },
      select: { smsSentAt: true, smsSending: true, smsLastAttemptAt: true },
    })

    if (existingStatus?.smsSentAt) return { shouldSend: false }

    // Clear stuck locks so updateMany can re-acquire.
    if (isSmsSendingLockStale(existingStatus, now)) {
      await tx.resultsStatus.update({
        where: { schoolId_studentId_term_year: key },
        data: { smsSending: false },
      })
    }

    const student = await tx.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        classId: true,
        selected_subjects: true,
        guardian_contact: true,
        parent_father_contact: true,
        parent_mother_contact: true,
        user: { select: { email: true, name: true } },
      },
    })

    if (!student) {
      await tx.resultsStatus.update({
        where: { schoolId_studentId_term_year: key },
        data: {
          subjectsEnrolled: 0,
          subjectsFinalized: 0,
          isComplete: false,
          completedAt: null,
          lastEvaluatedAt: now,
          smsLastAttemptAt: now,
          smsLastError: 'Student not found',
        },
      })
      return { shouldSend: false }
    }

    const effectiveClassId = String(classId || student.classId || '').trim()
    if (!effectiveClassId) {
      await tx.resultsStatus.update({
        where: { schoolId_studentId_term_year: key },
        data: {
          subjectsEnrolled: 0,
          subjectsFinalized: 0,
          isComplete: false,
          completedAt: null,
          lastEvaluatedAt: now,
          smsLastAttemptAt: now,
          smsLastError: 'Missing class context for subject enrollments',
        },
      })
      return { shouldSend: false }
    }

    const enrolledSubjectIds = await resolveEnrolledSubjectIds({
      schoolId,
      studentId,
      classId: effectiveClassId,
      student,
      tx,
    })

    if (enrolledSubjectIds.length === 0) {
      await tx.resultsStatus.update({
        where: { schoolId_studentId_term_year: key },
        data: {
          subjectsEnrolled: 0,
          subjectsFinalized: 0,
          isComplete: false,
          completedAt: null,
          lastEvaluatedAt: now,
          smsLastError: 'No enrolled subjects resolved',
        },
      })
      return { shouldSend: false }
    }

    const results = await tx.result.findMany({
      where: {
        schoolId,
        studentId,
        term,
        year,
        resultType: RESULT_TYPES.END_OF_TERM,
        subjectId: { in: enrolledSubjectIds },
      },
      select: { subjectId: true, workflowStatus: true },
      take: 50000,
    })

    const { subjectsEnrolled, subjectsFinalized, isComplete } = countFinalizedEnrolledSubjects(
      enrolledSubjectIds,
      results
    )

    await tx.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        subjectsEnrolled,
        subjectsFinalized,
        isComplete,
        completedAt: isComplete ? now : null,
        lastEvaluatedAt: now,
      },
    })

    if (!isComplete) return { shouldSend: false }

    const staleBefore = new Date(now.getTime() - SMS_SENDING_LOCK_TTL_MS)
    const lock = await tx.resultsStatus.updateMany({
      where: {
        ...key,
        isComplete: true,
        smsSentAt: null,
        OR: [
          { smsSending: false },
          { smsSending: true, smsLastAttemptAt: { lt: staleBefore } },
          { smsSending: true, smsLastAttemptAt: null },
        ],
      },
      data: {
        smsSending: true,
        smsLastAttemptAt: now,
        smsLastError: null,
      },
    })

    if (lock.count !== 1) return { shouldSend: false }

    return {
      shouldSend: true,
      studentName: student.name || student.user?.name || 'your child',
      contacts: extractParentContacts(student),
      schoolName: school?.name || 'School',
    }
  })

  if (!prepared?.shouldSend) return

  const to = prepared.contacts
  if (!Array.isArray(to) || to.length === 0) {
    await prismaClient.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        smsSending: false,
        smsLastAttemptAt: now,
        smsLastError: 'No parent/guardian contacts',
      },
    })
    return
  }

  const finalizedResults = await prismaClient.result.findMany({
    where: {
      schoolId,
      studentId,
      term,
      year: Number(year) || year,
      resultType: RESULT_TYPES.END_OF_TERM,
      workflowStatus: 'finalized',
    },
    select: {
      score: true,
      grade: true,
      subject: { select: { name: true } },
    },
    take: 50000,
  })

  const gradeRows = (finalizedResults || []).map((r) => ({
    subjectName: r.subject?.name || 'Subject',
    score: r.score,
    grade: r.grade,
  }))

  const message = buildTermResultsCompleteSmsMessage({
    studentName: prepared.studentName,
    schoolName: prepared.schoolName,
    results: gradeRows,
  })

  if (!message) {
    await prismaClient.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        smsSending: false,
        smsLastAttemptAt: now,
        smsLastError: 'No finalized results for SMS',
      },
    })
    return
  }

  try {
    const sendResult = await sendSchoolSms({
      to,
      message,
      from: getSchoolSmsFrom(school),
      schoolId,
    })
    if (!sendResult?.ok) {
      await prismaClient.resultsStatus.update({
        where: { schoolId_studentId_term_year: key },
        data: {
          smsSending: false,
          smsLastAttemptAt: now,
          smsLastError: String(
            sendResult?.failureReason || sendResult?.reason || 'SMS send failed'
          ).slice(0, 500),
        },
      })
      return
    }
    await prismaClient.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: { smsSending: false, smsSentAt: new Date(), smsLastAttemptAt: now, smsLastError: null },
    })
  } catch (e) {
    const errMsg =
      e instanceof Error
        ? e.message
        : typeof e?.message === 'string' && e.message
          ? e.message
          : e?.type === 'error'
            ? `Database/SMS transport error (${e.type})`
            : String(e?.message || e || 'Failed to send SMS')
    await prismaClient.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        smsSending: false,
        smsLastAttemptAt: now,
        smsLastError: errMsg.slice(0, 500),
      },
    })
  }
}

/** @deprecated Use checkAndNotifyParent — kept for existing imports */
export const evaluateAndNotifyTermResultsComplete = checkAndNotifyParent
