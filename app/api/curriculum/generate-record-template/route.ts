import { NextResponse } from 'next/server'
import { z } from 'zod'
import { put } from '@vercel/blob'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { exportRecordOfWorkTemplate } from '@/lib/curriculum/recordOfWorkExport'
import { getApprovedLessonPlansForRecord } from '@/lib/teaching/syncTaughtProgressFromLessonPlan'
import { weeksFromSchemeJson } from '@/lib/teaching/performanceSummary'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const InputSchema = z.object({
  subject: z.string().min(1).max(100),
  grade: z.union([z.string(), z.number()]),
  term: z.union([z.string(), z.number()]).default('Term 1'),
  year: z.number().int().min(2020).max(2100).optional(),
  weekCount: z.number().int().min(1).max(20).optional(),
  schemeId: z.string().optional(),
})

export const POST = withErrorHandler(async function POST(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const blocked = await requireFeature(schoolId, 'schemes-of-work')
  if (blocked) return blocked

  const input = InputSchema.parse(await request.json().catch(() => null))
  const grade = String(input.grade)
  const year = input.year || new Date().getFullYear()
  const term =
    typeof input.term === 'number' ? `Term ${input.term}` : String(input.term || 'Term 1')

  const ctx = await getLessonPlanTeacherContext(String(user.id), schoolId, input.subject)

  let weekCount = input.weekCount || 12
  const schemeWeekTopics = new Map<number, string>()
  const schemeWeekTypes = new Map<number, string>()
  let testSchedule: import('@/lib/teaching/testWeeks').TestScheduleLike | null = null

  if (input.schemeId) {
    const scheme = await prisma.schemeOfWork.findFirst({
      where: { id: input.schemeId, schoolId, teacherId: String(user.id) },
      include: { testSchedule: true },
    })
    if (scheme) {
      const weeks = weeksFromSchemeJson(scheme.weeks)
      weekCount = weeks.length || weekCount
      for (const w of weeks) {
        if (w.topic) schemeWeekTopics.set(w.week, w.topic)
        if (w.weekType) schemeWeekTypes.set(w.week, w.weekType)
      }
      testSchedule = scheme.testSchedule
    }
  } else {
    // Latest matching scheme for subject/grade/term (includes test schedule)
    const scheme = await prisma.schemeOfWork.findFirst({
      where: {
        schoolId,
        teacherId: String(user.id),
        subject: { equals: input.subject, mode: 'insensitive' },
        gradeOrForm: { equals: grade, mode: 'insensitive' },
        term,
        year,
      },
      include: { testSchedule: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (scheme) {
      const weeks = weeksFromSchemeJson(scheme.weeks)
      if (!input.weekCount && weeks.length) weekCount = weeks.length
      for (const w of weeks) {
        if (w.topic) schemeWeekTopics.set(w.week, w.topic)
        if (w.weekType) schemeWeekTypes.set(w.week, w.weekType)
      }
      testSchedule = scheme.testSchedule
    }
  }

  const { weekKindFromRow, testWeekRemarks, testWeekTopicLabel } =
    await import('@/lib/teaching/testWeeks')

  const approved = await getApprovedLessonPlansForRecord({
    schoolId,
    teacherId: String(user.id),
    subject: input.subject,
    grade,
    term,
    year,
  })

  const weekRows = Array.from({ length: weekCount }, (_, i) => {
    const week = i + 1
    const kind = weekKindFromRow(week, schemeWeekTypes.get(week), testSchedule)
    if (kind !== 'teaching') {
      return {
        week,
        taught: true,
        isTestWeek: true,
        topic: schemeWeekTopics.get(week) || testWeekTopicLabel(kind),
        dateTaught: '',
        remarks: testWeekRemarks(kind),
        signOff: 'Test week',
      }
    }

    const plans = approved.filter((p) => Number(p.weekNumber) === week)
    const byTopic =
      plans.length > 0
        ? plans
        : approved.filter((p) => {
            const planned = schemeWeekTopics.get(week)
            if (!planned || p.weekNumber != null) return false
            const t = String(p.topic || '').toLowerCase()
            const s = planned.toLowerCase()
            return t === s || t.includes(s) || s.includes(t)
          })

    const plan = byTopic[0]
    if (!plan) {
      return {
        week,
        taught: false,
        isTestWeek: false,
        topic: '',
        dateTaught: '',
        remarks: 'Not taught — no approved lesson plan',
        signOff: '',
      }
    }

    return {
      week,
      taught: true,
      isTestWeek: false,
      topic: plan.topic || schemeWeekTopics.get(week) || '',
      dateTaught: plan.approvedAt ? plan.approvedAt.toISOString().slice(0, 10) : '',
      remarks: plan.approvalNotes || 'Approved lesson plan',
      signOff: ctx.teacherName || 'Approved',
    }
  })

  const teachingRows = weekRows.filter((w) => !w.isTestWeek)
  const taughtCount = teachingRows.filter((w) => w.taught).length
  const teachingWeekCount = teachingRows.length

  const wordBuffer = await exportRecordOfWorkTemplate({
    schoolName: ctx.schoolName,
    teacherName: ctx.teacherName,
    subject: input.subject,
    gradeOrForm: grade,
    term,
    year,
    weekCount,
    weeks: weekRows,
  })

  let downloadUrl: string | null = null
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const filename = `records/${schoolId}/${input.subject}-${grade}-${Date.now()}.docx`
        .replace(/[^a-zA-Z0-9/._\- ]/g, '')
        .slice(0, 180)
      const blob = await put(filename, wordBuffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      downloadUrl = blob.url
    } catch {
      downloadUrl = null
    }
  }

  return NextResponse.json({
    success: true,
    downloadUrl,
    wordBase64: downloadUrl ? undefined : Buffer.from(wordBuffer).toString('base64'),
    summary: {
      weekCount,
      taughtWeeks: taughtCount,
      notTaughtWeeks: teachingWeekCount - taughtCount,
      testWeeks: weekCount - teachingWeekCount,
      rule: 'Only APPROVED lesson plans count as taught; mid/EOT test weeks are assessment-only',
    },
  })
})
