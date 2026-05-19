export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import {
  validateFormLevelForSBA,
  computeRubricScore,
  computeTotalSBAScore,
  SBA_TERM_TEST_MARKS,
} from '@/lib/ecz/ecz-compliance'
import { withSecureApi } from '@/lib/middleware/secureApi'

const STAFF_ROLES = ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher', 'admin']
const VALID_ATTENDANCE = ['present', 'absent', 'late', 'excused']

export const POST = withSecureApi(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, STAFF_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const attendanceBatches = Array.isArray(body?.attendance) ? body.attendance : []
  const scoreItems = Array.isArray(body?.scores) ? body.scores : []

  const attendanceResult = { synced: 0, failed: [] }
  const scoresResult = { synced: 0, failed: [] }

  for (let i = 0; i < attendanceBatches.length; i++) {
    const batch = attendanceBatches[i]
    try {
      const dateStr = String(batch?.date || '').trim()
      const records = Array.isArray(batch?.records) ? batch.records : []
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
          const studentId = String(r?.studentId || '').trim()
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

      await prisma.$transaction(
        writes.map((r) =>
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
      attendanceResult.synced += 1
    } catch (e) {
      attendanceResult.failed.push({ index: i, error: String(e?.message || e) })
    }
  }

  for (let i = 0; i < scoreItems.length; i++) {
    const item = scoreItems[i]
    try {
      const formLevel = Number(item.formLevel)
      const formCheck = validateFormLevelForSBA(formLevel)
      if (!formCheck.valid) throw new Error(formCheck.error)

      const assessment = await prisma.eczAssessment.findFirst({
        where: { id: String(item.assessmentId || ''), schoolId },
      })
      if (!assessment) throw new Error('Assessment not found')

      const studentId = String(item.studentId || '').trim()
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
  })
})
