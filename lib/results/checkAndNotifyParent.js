import prisma from '@/lib/prisma'
import {
  buildTermResultsCompleteSmsMessage,
  getSchoolPortalLoginUrls,
  getSchoolSmsFrom,
  sendAfricasTalkingSms,
} from '@/lib/sms'
import { RESULT_TYPES } from '@/lib/results/resultTypes'

export function extractParentContacts(student) {
  const raw = [
    student?.guardian_contact,
    student?.parent_father_contact,
    student?.parent_mother_contact,
  ]
  return raw.map((v) => String(v || '').trim()).filter(Boolean)
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
  const key = { schoolId, studentId, term, year }

  const school = await prismaClient.school.findFirst({
    where: { id: schoolId },
    select: { name: true, subdomain: true, domain: true },
  })
  const { loginUrl } = getSchoolPortalLoginUrls(request, school)

  const prepared = await prismaClient.$transaction(async (tx) => {
    const existingStatus = await tx.resultsStatus.upsert({
      where: { schoolId_studentId_term_year: key },
      create: { ...key },
      update: { lastEvaluatedAt: now },
      select: { smsSentAt: true, smsSending: true },
    })

    if (existingStatus?.smsSentAt) return { shouldSend: false }

    const student = await tx.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        classId: true,
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

    const enrollments = await tx.pupilSubjectEnrollment.findMany({
      where: { schoolId, pupilId: studentId, classId: effectiveClassId },
      select: { subjectId: true },
      take: 50000,
    })

    const enrolledSubjectIds = Array.from(
      new Set((enrollments || []).map((e) => String(e.subjectId || '').trim()).filter(Boolean))
    )

    if (enrolledSubjectIds.length === 0) {
      await tx.resultsStatus.update({
        where: { schoolId_studentId_term_year: key },
        data: {
          subjectsEnrolled: 0,
          subjectsFinalized: 0,
          isComplete: false,
          completedAt: null,
          lastEvaluatedAt: now,
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

    const lock = await tx.resultsStatus.updateMany({
      where: {
        ...key,
        isComplete: true,
        smsSentAt: null,
        smsSending: false,
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
      studentEmail: String(student.user?.email || '').trim(),
      contacts: extractParentContacts(student),
      schoolName: school?.name || 'School',
      loginUrl,
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

  const message = buildTermResultsCompleteSmsMessage({
    studentName: prepared.studentName,
    studentEmail: prepared.studentEmail,
    loginUrl: prepared.loginUrl,
    schoolName: prepared.schoolName,
  })

  try {
    await sendAfricasTalkingSms({
      to,
      message,
      from: getSchoolSmsFrom(school),
    })
    await prismaClient.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: { smsSending: false, smsSentAt: new Date(), smsLastAttemptAt: now, smsLastError: null },
    })
  } catch (e) {
    await prismaClient.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        smsSending: false,
        smsLastAttemptAt: now,
        smsLastError: String(e?.message || e || 'Failed to send SMS'),
      },
    })
  }
}

/** @deprecated Use checkAndNotifyParent — kept for existing imports */
export const evaluateAndNotifyTermResultsComplete = checkAndNotifyParent
