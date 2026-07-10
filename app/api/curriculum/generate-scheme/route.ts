import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { generateSchemeOfWork } from '@/lib/curriculum/schemeOfWorkGenerator'
import { exportSchemeToWord } from '@/lib/curriculum/schemeOfWorkExport'

export const dynamic = 'force-dynamic'

const InputSchema = z.object({
  subject: z.string().min(1).max(100),
  grade: z.union([z.string(), z.number()]),
  term: z.union([z.string(), z.number()]).default('Term 1'),
  year: z.number().int().min(2020).max(2100).optional(),
  weekCount: z.number().int().min(1).max(16).optional(),
  save: z.boolean().optional().default(true),
  submit: z.boolean().optional().default(false),
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

  const scheme = await generateSchemeOfWork({
    schoolId,
    subject: input.subject,
    grade,
    term,
    year,
    weekCount: input.weekCount,
  })

  const ctx = await getLessonPlanTeacherContext(String(user.id), schoolId, input.subject)
  const wordBuffer = await exportSchemeToWord({
    schoolName: ctx.schoolName,
    teacherName: ctx.teacherName,
    subject: scheme.subject,
    gradeOrForm: scheme.gradeOrForm,
    term: scheme.term,
    year: scheme.year,
    weeks: scheme.weeks,
  })

  let schemeId: string | null = null
  if (input.save !== false) {
    const status = input.submit ? 'SUBMITTED' : 'DRAFT'
    const row = await prisma.schemeOfWork.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        teacherId: String(user.id),
        subject: scheme.subject,
        gradeOrForm: scheme.gradeOrForm,
        term: scheme.term,
        year: scheme.year,
        weeks: scheme.weeks as object,
        status,
      },
    })
    schemeId = row.id

    if (input.submit) {
      try {
        const teacherProfile = await prisma.teacher.findFirst({
          where: { userId: String(user.id), schoolId },
          select: { id: true },
        })
        if (teacherProfile) {
          const termNum = Number(String(scheme.term).match(/\d+/)?.[0] || 1)
          await prisma.teacherTermProgress.upsert({
            where: {
              teacherId_year_term: {
                teacherId: teacherProfile.id,
                year: scheme.year,
                term: termNum,
              },
            },
            create: {
              id: crypto.randomUUID(),
              teacherId: teacherProfile.id,
              schoolId,
              year: scheme.year,
              term: termNum,
              schemeSubmitted: true,
            },
            update: { schemeSubmitted: true },
          })
        }
      } catch {
        // ignore progress sync failures
      }
    }
  }

  let downloadUrl: string | null = null
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const filename =
        `schemes/${schoolId}/${scheme.subject}-${scheme.gradeOrForm}-${Date.now()}.docx`
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
    schemeId,
    scheme,
    downloadUrl,
    wordBase64: downloadUrl ? undefined : Buffer.from(wordBuffer).toString('base64'),
  })
})

export const GET = withErrorHandler(async function GET(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const rows = await prisma.schemeOfWork.findMany({
    where: { schoolId, teacherId: String(user.id) },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ success: true, data: rows })
})
