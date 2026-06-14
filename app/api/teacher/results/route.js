export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { calculateGrade } from '@/lib/gradingSystem'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import {
  buildTermResultsCompleteSmsMessage,
  getSchoolPortalLoginUrls,
  sendAfricasTalkingSms,
} from '@/lib/sms'
import { normalizeResultType, RESULT_TYPES } from '@/lib/results/resultTypes'
import { assertSecondaryGradingForContext } from '@/lib/school/gradingAccess'
import { requireFeature } from '@/lib/middleware/planGate-zambia'

async function gunzipAsync(data) {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  await writer.write(data)
  await writer.close()
  const output = []
  const reader = ds.readable.getReader()
  let done, value
  while ((({ done, value } = await reader.read()), !done)) output.push(value)
  return Buffer.concat(output)
}

async function readJson(request) {
  const encoding = request.headers.get('content-encoding') || ''
  if (encoding.toLowerCase().includes('gzip')) {
    const buf = new Uint8Array(await request.arrayBuffer())
    const decompressed = await gunzipAsync(buf)
    return JSON.parse(decompressed.toString('utf-8'))
  }
  return request.json()
}

function parseTermYear(termRaw) {
  const term = String(termRaw || '').trim()
  const match = term.match(/(Term\s*\d+)\s*(\d{4})/i)
  if (match) return { term: match[1].trim(), year: Number(match[2]) }
  return { term: term || 'Term 1', year: new Date().getFullYear() }
}

function extractParentContacts(student) {
  const raw = [
    student?.guardian_contact,
    student?.parent_father_contact,
    student?.parent_mother_contact,
  ]
  return raw.map((v) => String(v || '').trim()).filter(Boolean)
}

async function evaluateAndNotifyTermResultsComplete({
  schoolId,
  studentId,
  classId,
  term,
  year,
  request,
}) {
  const now = new Date()

  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { subdomain: true, domain: true },
  })
  const { loginUrl, forgotPasswordUrl: resetUrl } = getSchoolPortalLoginUrls(request, school)

  const key = { schoolId, studentId, term, year }

  const prepared = await prisma.$transaction(async (tx) => {
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
        user: { select: { email: true } },
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

    const finalizedSubjectIds = new Set(
      (results || [])
        .filter(
          (r) =>
            String(r.workflowStatus || '')
              .trim()
              .toLowerCase() === 'finalized'
        )
        .map((r) => String(r.subjectId || '').trim())
        .filter(Boolean)
    )

    const subjectsFinalized = finalizedSubjectIds.size
    const isComplete = subjectsFinalized === enrolledSubjectIds.length

    await tx.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        subjectsEnrolled: enrolledSubjectIds.length,
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

    const contacts = extractParentContacts(student)
    const studentEmail = String(student?.user?.email || '').trim()

    return {
      shouldSend: true,
      studentName: student.name,
      studentEmail,
      contacts,
    }
  })

  if (!prepared?.shouldSend) return

  const to = prepared.contacts
  if (!Array.isArray(to) || to.length === 0) {
    await prisma.resultsStatus.update({
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
    loginUrl,
    resetUrl,
  })

  try {
    await sendAfricasTalkingSms({ to, message })
    await prisma.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: { smsSending: false, smsSentAt: new Date(), smsLastAttemptAt: now, smsLastError: null },
    })
  } catch (e) {
    await prisma.resultsStatus.update({
      where: { schoolId_studentId_term_year: key },
      data: {
        smsSending: false,
        smsLastAttemptAt: now,
        smsLastError: String(e?.message || e || 'Failed to send SMS'),
      },
    })
  }
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'basic-results')
  if (featureBlock) return featureBlock

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  const classId = searchParams.get('classId')
  const subjectId = searchParams.get('subjectId')
  const termRaw = searchParams.get('term')
  const yearRaw = searchParams.get('year')
  const resultTypeRaw = searchParams.get('resultType')
  const resultTypeFilter = resultTypeRaw ? normalizeResultType(resultTypeRaw) : null
  const scope = String(searchParams.get('scope') || '')
    .trim()
    .toLowerCase()

  await assertSecondaryGradingForContext(schoolId, {
    classId: String(classId || '').trim(),
    prismaClient: prisma,
  })

  const parsedTermYear = parseTermYear(termRaw)
  const term = parsedTermYear.term
  const year = yearRaw ? Number(yearRaw) : parsedTermYear.year

  const isTeacher = roleCheck(auth.user, ['TEACHER', 'teacher'])

  const resolvedClassId = String(classId || '').trim()
  const resolvedSubjectId = String(subjectId || '').trim()

  if (resolvedClassId && !resolvedSubjectId) {
    throw new ApiError('subjectId is required when filtering by classId', 400)
  }

  if (isTeacher && resolvedClassId && resolvedSubjectId) {
    const teacherProfile = await prisma.teacher.findFirst({
      where: { userId: auth.user.id, schoolId },
      select: {
        id: true,
        assignedSubjects: true,
        classes: { select: { id: true } },
        subjects: { select: { id: true, name: true } },
        teachingAssignments: { where: { schoolId }, select: { classId: true, subjectId: true } },
      },
    })
    if (!teacherProfile) throw new ApiError('Teacher profile not found', 404)

    const assignmentPairs = new Set(
      (teacherProfile.teachingAssignments || [])
        .filter((a) => a?.classId && a?.subjectId)
        .map((a) => `${a.classId}:${a.subjectId}`)
    )
    const hasTeachingAssignments = assignmentPairs.size > 0
    const allowedClassIds = new Set((teacherProfile.classes || []).map((c) => String(c.id)))
    const allowedSubjectIds = new Set((teacherProfile.subjects || []).map((s) => String(s.id)))
    const assignedSubjectTokens = new Set(
      (Array.isArray(teacherProfile.assignedSubjects) ? teacherProfile.assignedSubjects : [])
        .map((v) =>
          String(v || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )

    const classRecord = await prisma.class.findFirst({
      where: { schoolId, id: resolvedClassId },
      select: { id: true, teacherId: true },
    })
    const isAssignedToClass =
      allowedClassIds.has(resolvedClassId) ||
      String(classRecord?.teacherId || '') === String(teacherProfile.id)

    const subjectRecord = await prisma.subject.findFirst({
      where: { schoolId, id: resolvedSubjectId },
      select: { id: true, name: true },
    })
    const subjectName = String(subjectRecord?.name || '')
      .trim()
      .toLowerCase()
    const isAssignedToSubject =
      allowedSubjectIds.has(resolvedSubjectId) ||
      assignedSubjectTokens.has(resolvedSubjectId.toLowerCase()) ||
      (subjectName ? assignedSubjectTokens.has(subjectName) : false)

    const allowed = hasTeachingAssignments
      ? assignmentPairs.has(`${resolvedClassId}:${resolvedSubjectId}`)
      : isAssignedToClass && isAssignedToSubject

    if (!allowed) throw new ApiError('Forbidden', 403)
  }

  let rosterStudentIds =
    resolvedClassId && resolvedSubjectId
      ? (
          await prisma.pupilSubjectEnrollment.findMany({
            where: { schoolId, classId: resolvedClassId, subjectId: resolvedSubjectId },
            select: { pupilId: true },
            take: 50000,
          })
        )
          .map((e) => String(e.pupilId || '').trim())
          .filter(Boolean)
      : null

  if (resolvedClassId && resolvedSubjectId && Array.isArray(rosterStudentIds)) {
    const classRecord = await prisma.class.findFirst({
      where: { schoolId, id: resolvedClassId },
      select: { id: true, name: true, year_group: true, section: true },
    })

    const yearGroup = String(classRecord?.year_group || '').trim()
    const section = String(classRecord?.section || '').trim()
    const compact = `${yearGroup}${section}`.trim()
    const spaced = `${yearGroup} ${section}`.trim()
    const classCandidates = classRecord
      ? Array.from(
          new Set(
            [
              classRecord.name,
              classRecord.id,
              yearGroup,
              compact,
              spaced,
              String(classRecord.name || '').replace(/\s+/g, ''),
            ]
              .map((v) => String(v || '').trim())
              .filter(Boolean)
          )
        )
      : []

    const classOr =
      classRecord && classCandidates.length > 0
        ? [
            { classId: classRecord.id },
            ...classCandidates.map((c) => ({ class: { equals: c, mode: 'insensitive' } })),
          ]
        : classRecord
          ? [
              { classId: classRecord.id },
              { class: { equals: classRecord.name, mode: 'insensitive' } },
            ]
          : []

    // Always merge class membership with subject enrollments.
    // This prevents "partial enrollment" data from hiding already-entered student results in the gradebook.
    if (classOr.length > 0) {
      const studentsInClass = await prisma.student.findMany({
        where: { schoolId, OR: classOr },
        select: { id: true },
        take: 50000,
      })
      const classStudentIds = studentsInClass.map((s) => String(s.id || '').trim()).filter(Boolean)
      rosterStudentIds = Array.from(
        new Set([...(rosterStudentIds || []), ...classStudentIds].filter(Boolean))
      )
    }
  }

  const where = {
    schoolId,
    ...(studentId ? { studentId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(term ? { term } : {}),
    ...(year ? { year } : {}),
    ...(resultTypeFilter ? { resultType: resultTypeFilter } : {}),
    ...(Array.isArray(rosterStudentIds) ? { studentId: { in: rosterStudentIds } } : {}),
    ...(isTeacher && scope !== 'all' && !resolvedClassId ? { enteredByUserId: auth.user.id } : {}),
  }

  const results = await prisma.result.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(
    {
      success: true,
      data: results.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        subjectId: r.subjectId,
        score: r.score,
        grade: r.grade,
        term: r.term,
        year: r.year,
        resultType: r.resultType,
        comments: r.comments,
        updatedAt: r.updatedAt,
      })),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const isTeacher = roleCheck(auth.user, ['TEACHER', 'teacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  if (!isTeacher && !isHod && !isAdmin) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'basic-results')
  if (featureBlock) return featureBlock

  const body = await readJson(request)
  const results = (() => {
    if (Array.isArray(body?.results)) return body.results
    if (Array.isArray(body)) return body
    if (body && typeof body === 'object') {
      if (Array.isArray(body?.data)) return body.data
      if (Array.isArray(body?.entries)) return body.entries
      const hasSingleEntryFields =
        (body?.studentId || body?.pupilId) && body?.subjectId && (body?.classId || body?.term)
      if (hasSingleEntryFields) return [body]
    }
    return null
  })()

  if (!Array.isArray(results)) throw new ApiError('Invalid data format', 400)

  const batchResultType = normalizeResultType(body?.resultType)

  const teacherProfile = isAdmin
    ? null
    : await prisma.teacher.findFirst({
        where: { userId: auth.user.id, schoolId },
        select: {
          id: true,
          assignedSubjects: true,
          classes: { select: { id: true, name: true } },
          subjects: { select: { id: true, name: true, classId: true } },
          teachingAssignments: { where: { schoolId }, select: { classId: true, subjectId: true } },
        },
      })

  const isStaffEntry = isAdmin || (isHod && !teacherProfile)
  if (!isStaffEntry && !teacherProfile) throw new ApiError('Teacher profile not found', 404)

  const assignmentPairs = new Set(
    (teacherProfile?.teachingAssignments || [])
      .filter((a) => a?.classId && a?.subjectId)
      .map((a) => `${a.classId}:${a.subjectId}`)
  )
  const hasTeachingAssignments = assignmentPairs.size > 0
  const allowedClassIds = new Set((teacherProfile?.classes || []).map((c) => String(c.id)))
  const allowedSubjectIds = new Set((teacherProfile?.subjects || []).map((s) => String(s.id)))
  const assignedSubjectTokens = new Set(
    (Array.isArray(teacherProfile?.assignedSubjects) ? teacherProfile.assignedSubjects : [])
      .map((v) =>
        String(v || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  )

  const subjectNameById = new Map()
  if (!isStaffEntry) {
    const subjectIdsInPayload = Array.from(
      new Set(results.map((r) => String(r.subjectId || '').trim()).filter(Boolean))
    )
    const subjectsInPayload =
      subjectIdsInPayload.length > 0
        ? await prisma.subject.findMany({
            where: { schoolId, id: { in: subjectIdsInPayload } },
            select: { id: true, name: true },
            take: 50000,
          })
        : []
    for (const s of subjectsInPayload) subjectNameById.set(String(s.id), s.name)
  }

  const conflicts = []
  let applied = 0
  let skippedNotAssigned = 0
  const touched = new Map()

  const classIds = Array.from(
    new Set(
      results
        .map((r) => r.classId)
        .filter(Boolean)
        .map(String)
    )
  )
  const classMap = new Map(
    (await prisma.class.findMany({ where: { schoolId, id: { in: classIds } } })).map((c) => [
      c.id,
      c,
    ])
  )

  await assertSecondaryGradingForContext(schoolId, { prismaClient: prisma })
  for (const cid of classIds) {
    const c = classMap.get(cid)
    if (!c) continue
    await assertSecondaryGradingForContext(schoolId, {
      gradeLevel: c.year_group || c.name,
      prismaClient: prisma,
    })
  }

  const enrollmentKeys = new Set()
  const classMembershipKeys = new Set()
  if (isStaffEntry) {
    const studentIds = Array.from(
      new Set(results.map((r) => String(r.studentId || r.pupilId || '').trim()).filter(Boolean))
    )
    const subjectIds = Array.from(
      new Set(results.map((r) => String(r.subjectId || '').trim()).filter(Boolean))
    )

    const enrollments =
      studentIds.length > 0 && classIds.length > 0 && subjectIds.length > 0
        ? await prisma.pupilSubjectEnrollment.findMany({
            where: {
              schoolId,
              classId: { in: classIds },
              subjectId: { in: subjectIds },
              pupilId: { in: studentIds },
            },
            select: { pupilId: true, classId: true, subjectId: true },
            take: 50000,
          })
        : []

    for (const e of enrollments) {
      enrollmentKeys.add(`${e.pupilId}:${e.classId}:${e.subjectId}`)
    }

    const normalize = (v) =>
      String(v || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
    const compact = (v) => normalize(v).replace(/\s+/g, '')

    const classCandidateToId = new Map()
    for (const c of classMap.values()) {
      const yearGroup = String(c?.year_group || '').trim()
      const section = String(c?.section || '').trim()
      const variants = Array.from(
        new Set(
          [
            c?.name,
            yearGroup,
            `${yearGroup}${section}`.trim(),
            `${yearGroup} ${section}`.trim(),
            String(c?.name || '').replace(/\s+/g, ''),
          ]
            .map((x) => String(x || '').trim())
            .filter(Boolean)
        )
      )
      for (const v of variants) classCandidateToId.set(compact(v), String(c.id))
    }

    const students =
      studentIds.length > 0
        ? await prisma.student.findMany({
            where: { schoolId, id: { in: studentIds } },
            select: { id: true, classId: true, class: true },
            take: 50000,
          })
        : []

    for (const s of students) {
      const sid = String(s?.id || '').trim()
      if (!sid) continue
      const cid = String(s?.classId || '').trim()
      if (cid && classIds.includes(cid)) classMembershipKeys.add(`${sid}:${cid}`)
      const inferred = classCandidateToId.get(compact(s?.class))
      if (inferred && classIds.includes(inferred)) classMembershipKeys.add(`${sid}:${inferred}`)
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const r of results) {
      const studentId = String(r.studentId || r.pupilId || '').trim()
      const subjectId = String(r.subjectId || '').trim()
      const classId = String(r.classId || '').trim()
      const score =
        r.score === '' || r.score === null || r.score === undefined ? null : Number(r.score)
      const resolution = r.resolution ? String(r.resolution) : null
      const baseUpdatedAt = r.baseUpdatedAt ? new Date(r.baseUpdatedAt) : null
      const workflowStatusRaw = String(r.workflowStatus || r.status || '').trim()
      const workflowStatus = workflowStatusRaw ? workflowStatusRaw.toLowerCase() : 'finalized'
      const normalizedWorkflowStatus =
        workflowStatus === 'draft' ||
        workflowStatus === 'pending_review' ||
        workflowStatus === 'finalized'
          ? workflowStatus
          : 'finalized'

      if (!studentId || !subjectId || !classId) continue
      if (score === null) continue
      if (Number.isNaN(score) || score < 0 || score > 100) continue

      const classRecord = classMap.get(classId)
      const isAssignedToClass =
        allowedClassIds.has(classId) ||
        String(classRecord?.teacherId || '') === String(teacherProfile?.id || '')

      const subjectName = String(subjectNameById.get(subjectId) || '')
        .trim()
        .toLowerCase()
      const isAssignedToSubject =
        allowedSubjectIds.has(subjectId) ||
        assignedSubjectTokens.has(subjectId.toLowerCase()) ||
        (subjectName ? assignedSubjectTokens.has(subjectName) : false)

      const allowed = isStaffEntry
        ? enrollmentKeys.has(`${studentId}:${classId}:${subjectId}`) ||
          classMembershipKeys.has(`${studentId}:${classId}`)
        : hasTeachingAssignments
          ? assignmentPairs.has(`${classId}:${subjectId}`)
          : isAssignedToClass && isAssignedToSubject

      if (!allowed) {
        skippedNotAssigned += 1
        continue
      }

      const termRaw = String(r.term || '').trim()
      if (!termRaw) {
        throw new ApiError('Select the term you are entering the results', 400)
      }

      const termYear = parseTermYear(termRaw)
      const term = termYear.term
      const year = Number(r.year || termYear.year)
      const resultType = normalizeResultType(r.resultType || batchResultType)

      const existing = await tx.result.findFirst({
        where: { schoolId, studentId, subjectId, term, year, resultType },
        orderBy: { updatedAt: 'desc' },
      })

      if (
        existing &&
        baseUpdatedAt &&
        existing.updatedAt.getTime() !== baseUpdatedAt.getTime() &&
        !resolution
      ) {
        conflicts.push({
          key: { schoolId, studentId, subjectId, term, year, resultType },
          server: {
            id: existing.id,
            score: existing.score,
            grade: existing.grade,
            term: existing.term,
            year: existing.year,
            resultType: existing.resultType,
            updatedAt: existing.updatedAt,
          },
          client: {
            score,
            term,
            year,
            resultType,
            baseUpdatedAt,
          },
        })
        continue
      }

      if (existing && resolution === 'keep_server') {
        continue
      }

      const classRecordForGrade = classRecord
      const gradeLevel = classRecordForGrade?.year_group || classRecordForGrade?.name || ''
      const grade = calculateGrade(score, gradeLevel).grade

      if (existing) {
        await tx.result.update({
          where: { id: existing.id },
          data: {
            score,
            grade,
            resultType,
            enteredByUserId: auth.user.id,
            workflowStatus: normalizedWorkflowStatus,
          },
        })
      } else {
        await tx.result.create({
          data: {
            schoolId,
            studentId,
            subjectId,
            score,
            grade,
            term,
            year,
            resultType,
            enteredByUserId: auth.user.id,
            workflowStatus: normalizedWorkflowStatus,
          },
        })
      }

      if (resultType === RESULT_TYPES.END_OF_TERM) {
        touched.set(`${studentId}|${term}|${year}`, { studentId, classId, term, year })
      }
      applied += 1
    }
  })

  if (conflicts.length > 0) {
    return NextResponse.json({ success: false, conflicts, applied }, { status: 409 })
  }

  for (const entry of touched.values()) {
    try {
      await evaluateAndNotifyTermResultsComplete({
        schoolId,
        studentId: entry.studentId,
        classId: entry.classId,
        term: entry.term,
        year: entry.year,
        request,
      })
    } catch {}
  }

  return NextResponse.json({ success: true, applied, skippedNotAssigned })
})

function buildTeacherAssignmentSets(teacherProfile) {
  const assignmentPairs = new Set(
    (teacherProfile?.teachingAssignments || [])
      .filter((a) => a?.classId && a?.subjectId)
      .map((a) => `${a.classId}:${a.subjectId}`)
  )
  const hasTeachingAssignments = assignmentPairs.size > 0
  const allowedClassIds = new Set((teacherProfile?.classes || []).map((c) => String(c.id)))
  const allowedSubjectIds = new Set((teacherProfile?.subjects || []).map((s) => String(s.id)))
  const assignedSubjectTokens = new Set(
    (Array.isArray(teacherProfile?.assignedSubjects) ? teacherProfile.assignedSubjects : [])
      .map((v) =>
        String(v || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  )
  return {
    assignmentPairs,
    hasTeachingAssignments,
    allowedClassIds,
    allowedSubjectIds,
    assignedSubjectTokens,
  }
}

function teacherMayManageClassSubject(
  ctx,
  teacherProfile,
  classRecord,
  classId,
  subjectId,
  subjectNameLower
) {
  const isAssignedToClass =
    ctx.allowedClassIds.has(classId) ||
    String(classRecord?.teacherId || '') === String(teacherProfile.id)

  const isAssignedToSubject =
    ctx.allowedSubjectIds.has(subjectId) ||
    ctx.assignedSubjectTokens.has(subjectId.toLowerCase()) ||
    (subjectNameLower ? ctx.assignedSubjectTokens.has(subjectNameLower) : false)

  return ctx.hasTeachingAssignments
    ? ctx.assignmentPairs.has(`${classId}:${subjectId}`)
    : isAssignedToClass && isAssignedToSubject
}

/**
 * DELETE must use the same assignment rules as POST. Teachers often have Class/Subject
 * links without TeachingAssignment rows; the previous implementation only checked TeachingAssignment
 * and returned 403 after successful saves via profile assignment.
 */
async function assertMayDeleteResult({
  schoolId,
  result,
  teacherProfile,
  subjectName,
  isStaffEntry,
}) {
  const subjectNameLower = String(subjectName || '')
    .trim()
    .toLowerCase()

  const student = await prisma.student.findFirst({
    where: { schoolId, id: result.studentId },
    select: { id: true, classId: true, class: true },
  })

  const enrollmentRows = await prisma.pupilSubjectEnrollment.findMany({
    where: { schoolId, pupilId: result.studentId, subjectId: result.subjectId },
    select: { classId: true },
    take: 50000,
  })

  const candidateClassIds = new Set()
  for (const e of enrollmentRows) {
    if (e?.classId) candidateClassIds.add(String(e.classId))
  }
  if (student?.classId) candidateClassIds.add(String(student.classId))

  const compact = (v) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')

  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, year_group: true, section: true },
    take: 5000,
  })
  const classCandidateToId = new Map()
  for (const c of classes) {
    const yearGroup = String(c?.year_group || '').trim()
    const section = String(c?.section || '').trim()
    const variants = Array.from(
      new Set(
        [
          c?.name,
          yearGroup,
          `${yearGroup}${section}`.trim(),
          `${yearGroup} ${section}`.trim(),
          String(c?.name || '').replace(/\s+/g, ''),
        ]
          .map((x) => String(x || '').trim())
          .filter(Boolean)
      )
    )
    for (const v of variants) classCandidateToId.set(compact(v), String(c.id))
  }

  const inferredClassId = classCandidateToId.get(compact(student?.class))
  if (inferredClassId) candidateClassIds.add(inferredClassId)

  const classIds = Array.from(candidateClassIds).filter(Boolean)

  if (isStaffEntry) {
    for (const classId of classIds) {
      const enrollment = await prisma.pupilSubjectEnrollment.findFirst({
        where: {
          schoolId,
          pupilId: result.studentId,
          subjectId: result.subjectId,
          classId,
        },
        select: { id: true },
      })
      const inStudentClass =
        String(student?.classId || '') === classId || inferredClassId === classId
      if (enrollment || inStudentClass) return
    }
    throw new ApiError('Forbidden', 403)
  }

  const ctx = buildTeacherAssignmentSets(teacherProfile)

  for (const classId of classIds) {
    const classRecord = await prisma.class.findFirst({
      where: { schoolId, id: classId },
      select: { id: true, teacherId: true },
    })
    if (!classRecord) continue

    if (
      teacherMayManageClassSubject(
        ctx,
        teacherProfile,
        classRecord,
        classId,
        result.subjectId,
        subjectNameLower
      )
    ) {
      return
    }
  }

  throw new ApiError('Forbidden', 403)
}

export const DELETE = withErrorHandler(async function DELETE(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const isTeacher = roleCheck(auth.user, ['TEACHER', 'teacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  const isAdmin = roleCheck(auth.user, ['ADMIN', 'headteacher'])

  if (!isTeacher && !isHod && !isAdmin) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const id = String(searchParams.get('id') || '').trim()
  if (!id) throw new ApiError('Result id is required', 400)

  if (isAdmin) {
    const result = await prisma.result.findFirst({
      where: { id, schoolId },
      select: { id: true },
    })
    if (!result) throw new ApiError('Result not found', 404)

    await prisma.result.delete({ where: { id: result.id } })
    return NextResponse.json({ success: true })
  }

  const teacherProfile = await prisma.teacher.findFirst({
    where: { userId: auth.user.id, schoolId },
    select: {
      id: true,
      assignedSubjects: true,
      classes: { select: { id: true } },
      subjects: { select: { id: true, name: true } },
      teachingAssignments: { where: { schoolId }, select: { classId: true, subjectId: true } },
    },
  })

  const isStaffEntry = isHod && !teacherProfile
  if (!isStaffEntry && !teacherProfile) throw new ApiError('Teacher profile not found', 404)

  const result = await prisma.result.findFirst({
    where: { id, schoolId },
    select: { id: true, studentId: true, subjectId: true },
  })
  if (!result) throw new ApiError('Result not found', 404)

  const subjectRecord = await prisma.subject.findFirst({
    where: { schoolId, id: result.subjectId },
    select: { name: true },
  })

  await assertMayDeleteResult({
    schoolId,
    result,
    teacherProfile,
    subjectName: subjectRecord?.name,
    isStaffEntry,
  })

  await prisma.result.delete({ where: { id: result.id } })

  return NextResponse.json({ success: true })
})
