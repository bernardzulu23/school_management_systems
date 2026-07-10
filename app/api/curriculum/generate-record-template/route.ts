import { NextResponse } from 'next/server'
import { z } from 'zod'
import { put } from '@vercel/blob'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { requireFeature } from '@/lib/middleware/planGate-zambia'
import { getLessonPlanTeacherContext } from '@/lib/lesson-plans/teacher-context'
import { exportRecordOfWorkTemplate } from '@/lib/curriculum/recordOfWorkExport'

export const dynamic = 'force-dynamic'

const InputSchema = z.object({
  subject: z.string().min(1).max(100),
  grade: z.union([z.string(), z.number()]),
  term: z.union([z.string(), z.number()]).default('Term 1'),
  year: z.number().int().min(2020).max(2100).optional(),
  weekCount: z.number().int().min(1).max(16).optional(),
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
  const wordBuffer = await exportRecordOfWorkTemplate({
    schoolName: ctx.schoolName,
    teacherName: ctx.teacherName,
    subject: input.subject,
    gradeOrForm: grade,
    term,
    year,
    weekCount: input.weekCount,
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
  })
})
