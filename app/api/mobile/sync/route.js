export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import {
  validateFormLevelForSBA,
  computeRubricScore,
  computeTotalSBAScore,
  SBA_TERM_TEST_MARKS,
} from '@/lib/ecz/ecz-compliance'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { recordAttendanceMark, closeAttendanceSession } from '@/lib/attendance/sessions'
import { scheduleParentAttendanceSmsBatch } from '@/lib/attendance/parentNotifications'
import { safeStringId } from '@/lib/security/safeQueryValue'

const STAFF_ROLES = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']
const VALID_ATTENDANCE = ['present', 'absent', 'late', 'excused']
const MAX_BATCH = 50
const MAX_RECORDS_PER_BATCH = 60
const MAX_MARKS_PER_SESSION = 60

export const POST = withSecureHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, STAFF_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const attendanceBatches = (Array.isArray(body?.attendance) ? body.attendance : []).slice(
    0,
    MAX_BATCH
  )
  const scoreItems = (Array.isArray(body?.scores) ? body.scores : []).slice(0, MAX_BATCH)
  const lessonSessions = (Array.isArray(body?.lessonSessions) ? body.lessonSessions : []).slice(
    0,
    MAX_BATCH
  )

  if (
    (Array.isArray(body?.attendance) && body.attendance.length > MAX_BATCH) ||
    (Array.isArray(body?.scores) && body.scores.length > MAX_BATCH) ||
    (Array.isArray(body?.lessonSessions) && body.lessonSessions.length > MAX_BATCH)
  ) {
    return NextResponse.json(
      { error: `Batch size exceeds limit of ${MAX_BATCH} per category` },
      { status: 400 }
    )
  }

  const attendanceResult = { synced: 0, failed: [] }
  const scoresResult = { synced: 0, failed: [] }
  const lessonSessionsResult = { synced: 0, failed: [] }

  for (let i = 0; i < attendanceBatches.length; i++) {
    const batch = attendanceBatches[i]
    try {
      const dateStr = String(batch?.date || '').trim()
      const records = (Array.isArray(batch?.records) ? batch.records : []).slice(
        0,
        MAX_RECORDS_PER_BATCH
      )
      if (!dateStr || !records.length) throw new Error('date and records required')

      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) throw new Error('Invalid date')
      const normalized = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      )

      const writes = records
        .map((r) => {
          const status = String(r?.status || '').toLowerCase()
          if (!VALID_ATTENDANCE.includes(status)) return null
          const studentId = safeStringId(r?.studentId)
          if (!studentId) return null
          return {
            studentId,
            status,
            remarks: r?.remarks != null ? String(r.remarks || '') : null,
            date: normalized,
          }
        })
        .filter(Boolean)

      if (!writes.length) throw new Error('No valid attendance records')

      const studentIds = [...new Set(writes.map((w) => w.studentId))]
      const knownStudents = await prisma.student.findMany({
        where: { schoolId, id: { in: studentIds } },
        select: { id: true },
      })
      const knownSet = new Set(knownStudents.map((s) => s.id))
      const validWrites = writes.filter((w) => knownSet.has(w.studentId))
      if (!validWrites.length) throw new Error('No valid students in attendance records')

      const existingRows = await prisma.attendance.findMany({
        where: {
          schoolId,
          date: normalized,
          studentId: { in: validWrites.map((w) => w.studentId) },
        },
        select: { studentId: true, status: true },
      })
      const existingByStudent = new Map(
        existingRows.map((r) => [String(r.studentId), String(r.status || '')])
      )

      await prisma.$transaction(
        validWrites.map((r) =>
          prisma.attendance.upsert({
            where: { studentId_date: { studentId: r.studentId, date: r.date } },
            create: {
              schoolId,
              studentId: r.studentId,
              date: r.date,
              status: r.status,
              remarks: r.remarks,
            },
            update: { status: r.status, remarks: r.remarks },
          })
        )
      )

      // Send parent SMS for new/changed attendance statuses synced from mobile app.
      const changedWrites = validWrites.filter(
        (w) =>
          String(existingByStudent.get(String(w.studentId)) || '').toLowerCase() !==
          String(w.status)
      )
      scheduleParentAttendanceSmsBatch({
        marks: changedWrites.map((w) => ({
          studentId: w.studentId,
          status: w.status,
          date: w.date,
        })),
        schoolId,
        sessionId: null,
        date: new Date(),
      })
      attendanceResult.synced += 1
    } catch (e) {
      attendanceResult.failed.push({ index: i, error: String(e?.message || e) })
    }
  }

  for (let i = 0; i < lessonSessions.length; i++) {
    const item = lessonSessions[i]
    try {
      const sessionId = safeStringId(item?.sessionId)
      if (!sessionId) throw new Error('sessionId required')

      const marks = (Array.isArray(item?.marks) ? item.marks : []).slice(0, MAX_MARKS_PER_SESSION)
      for (const m of marks) {
        const studentId = safeStringId(m?.studentId)
        if (!studentId) continue
        await recordAttendanceMark({
          sessionId,
          schoolId,
          studentId,
          method: m.method || 'MANUAL',
          faceMatchScore: m.faceMatchScore,
          secondaryVerified: Boolean(m.secondaryVerified),
          statusOverride: m.status ? String(m.status).toUpperCase() : undefined,
        })
      }

      if (item.close) {
        await closeAttendanceSession({
          sessionId,
          schoolId,
          sendAbsentSms: item.sendAbsentSms !== false,
        })
      }

      lessonSessionsResult.synced += 1
    } catch (e) {
      lessonSessionsResult.failed.push({ index: i, error: String(e?.message || e) })
    }
  }

  for (let i = 0; i < scoreItems.length; i++) {
    const item = scoreItems[i]
    try {
      const formLevel = Number(item.formLevel)
      const formCheck = validateFormLevelForSBA(formLevel)
      if (!formCheck.valid) throw new Error(formCheck.error)

      const assessmentId = safeStringId(item.assessmentId)
      if (!assessmentId) throw new Error('assessmentId required')

      const assessment = await prisma.eczAssessment.findFirst({
        where: { id: assessmentId, schoolId },
      })
      if (!assessment) throw new Error('Assessment not found')

      const studentId = safeStringId(item.studentId)
      if (!studentId) throw new Error('studentId required')

      const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } })
      if (!student) throw new Error('Student not found')

      const academicYear = Number(item.academicYear) || new Date().getFullYear()
      const taskNumber = Number(item.taskNumber) || 1

      let taskScore = Number(item.score)
      if (Number.isNaN(taskScore) && item.excellentCount !== undefined) {
        const { calculatedScore } = computeRubricScore(item)
        taskScore =
          taskNumber === 4 ? Math.min(SBA_TERM_TEST_MARKS, calculatedScore * 2) : calculatedScore
      }
      if (Number.isNaN(taskScore)) taskScore = 0

      const existing = await prisma.eczAssessmentScore.findUnique({
        where: {
          assessmentId_studentId_academicYear: {
            assessmentId: assessment.id,
            studentId,
            academicYear,
          },
        },
      })

      const patch = {}
      if (taskNumber === 1) patch.task1Score = Math.min(20, taskScore)
      else if (taskNumber === 2) patch.task2Score = Math.min(20, taskScore)
      else if (taskNumber === 3) patch.task3Score = Math.min(20, taskScore)
      else if (taskNumber === 4) patch.termTestScore = Math.min(SBA_TERM_TEST_MARKS, taskScore)

      const merged = {
        task1Score: existing?.task1Score ?? 0,
        task2Score: existing?.task2Score ?? 0,
        task3Score: existing?.task3Score ?? 0,
        termTestScore: existing?.termTestScore ?? 0,
        ...patch,
      }
      patch.totalSBAScore = computeTotalSBAScore(merged)
      patch.submissionStatus = 'COMPLETED'

      await prisma.eczAssessmentScore.upsert({
        where: {
          assessmentId_studentId_academicYear: {
            assessmentId: assessment.id,
            studentId,
            academicYear,
          },
        },
        create: {
          schoolId,
          assessmentId: assessment.id,
          studentId,
          formLevel,
          academicYear,
          recordedBy: auth.user.id,
          ...patch,
        },
        update: patch,
      })

      scoresResult.synced += 1
    } catch (e) {
      scoresResult.failed.push({ index: i, error: String(e?.message || e) })
    }
  }

  return NextResponse.json({
    success: true,
    attendance: attendanceResult,
    scores: scoresResult,
    lessonSessions: lessonSessionsResult,
  })
})
