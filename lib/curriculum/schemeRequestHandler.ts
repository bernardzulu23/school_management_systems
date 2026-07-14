/**
 * Shared scheme-of-work API handler (JSON / CSV / Word).
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { generateSchemeOfWork } from '@/lib/curriculum/schemeOfWorkGenerator'
import { exportSchemeToCsv, exportSchemeToWord } from '@/lib/curriculum/schemeOfWorkExport'

export const SchemeInputSchema = z.object({
  subject: z.string().min(1).max(100),
  grade: z.union([z.string(), z.number()]),
  term: z.union([z.string(), z.number()]).default('Term 1'),
  year: z.number().int().min(2020).max(2100).optional(),
  academicYear: z.number().int().min(2020).max(2100).optional(),
  weekCount: z.number().int().min(1).max(20).optional(),
  weeksPerTerm: z.number().int().min(1).max(20).optional(),
  midTermWeek: z.number().int().min(1).max(20).nullable().optional(),
  midTermWeekEnd: z.number().int().min(1).max(20).nullable().optional(),
  endOfTermWeek: z.number().int().min(1).max(20).nullable().optional(),
  endOfTermWeekEnd: z.number().int().min(1).max(20).nullable().optional(),
  format: z.enum(['word', 'csv', 'json']).optional().default('word'),
  save: z.boolean().optional().default(true),
  submit: z.boolean().optional().default(false),
})

export async function handleSchemePost(request: Request): Promise<NextResponse> {
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

  const input = SchemeInputSchema.parse(await request.json().catch(() => null))
  const grade = String(input.grade)
  const year = input.year || input.academicYear || new Date().getFullYear()
  const term =
    typeof input.term === 'number' ? `Term ${input.term}` : String(input.term || 'Term 1')
  const weekCount = input.weekCount ?? input.weeksPerTerm ?? 12
  const format = input.format || 'word'

  const scheme = await generateSchemeOfWork({
    schoolId,
    subject: input.subject,
    grade,
    term,
    year,
    weekCount,
    midTermWeek: input.midTermWeek,
    midTermWeekEnd: input.midTermWeekEnd,
    endOfTermWeek: input.endOfTermWeek,
    endOfTermWeekEnd: input.endOfTermWeekEnd,
  })

  const ctx = await getLessonPlanTeacherContext(String(user.id), schoolId, input.subject)

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

    if (
      schemeId &&
      (input.midTermWeek != null ||
        input.endOfTermWeek != null ||
        input.midTermWeekEnd != null ||
        input.endOfTermWeekEnd != null)
    ) {
      await prisma.schemeTestSchedule.upsert({
        where: { schemeId },
        create: {
          schoolId,
          schemeId,
          teacherId: String(user.id),
          midTermWeek: input.midTermWeek ?? null,
          midTermWeekEnd: input.midTermWeekEnd ?? input.midTermWeek ?? null,
          endOfTermWeek: input.endOfTermWeek ?? null,
          endOfTermWeekEnd: input.endOfTermWeekEnd ?? input.endOfTermWeek ?? null,
        },
        update: {
          midTermWeek: input.midTermWeek ?? undefined,
          midTermWeekEnd: input.midTermWeekEnd ?? input.midTermWeek ?? undefined,
          endOfTermWeek: input.endOfTermWeek ?? undefined,
          endOfTermWeekEnd: input.endOfTermWeekEnd ?? input.endOfTermWeek ?? undefined,
        },
      })
    }

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

  const baseName = `scheme-${scheme.subject}-${scheme.gradeOrForm}-${scheme.term}-${scheme.year}`
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._\-]/g, '')

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      schemeId,
      scheme,
      downloadUrls: {
        csv: null,
        word: null,
      },
      message: 'Use format=word or format=csv for file download',
    })
  }

  if (format === 'csv') {
    const csv = exportSchemeToCsv({
      subject: scheme.subject,
      gradeOrForm: scheme.gradeOrForm,
      term: scheme.term,
      year: scheme.year,
      weeks: scheme.weeks,
    })
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.csv"`,
        'X-Scheme-Id': schemeId || '',
      },
    })
  }

  const wordBuffer = await exportSchemeToWord({
    schoolName: ctx.schoolName,
    teacherName: ctx.teacherName,
    subject: scheme.subject,
    gradeOrForm: scheme.gradeOrForm,
    term: scheme.term,
    year: scheme.year,
    weeks: scheme.weeks,
  })

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
}

export async function handleSchemeGet(request: Request): Promise<NextResponse> {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const schemeId = new URL(request.url).searchParams.get('id')
  if (schemeId) {
    const row = await prisma.schemeOfWork.findFirst({
      where: { id: schemeId, schoolId, teacherId: String(user.id) },
      include: { testSchedule: true },
    })
    if (!row) return NextResponse.json({ error: 'Scheme not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: row })
  }

  const rows = await prisma.schemeOfWork.findMany({
    where: { schoolId, teacherId: String(user.id) },
    include: { testSchedule: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ success: true, data: rows })
}
