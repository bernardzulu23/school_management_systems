import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { routeGeneration } from '@/lib/curriculum/generators/router'
import { MissingPastPaperError } from '@/lib/curriculum/generators/oldSyllabusGenerate'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  contentType: z.enum([
    'scheme',
    'recordOfWork',
    'quiz',
    'test',
    'termAssessment',
    'flashcards',
    'lessonPlan',
  ]),
  canonicalLevel: z.enum(['SS1', 'SS2', 'SS3']),
  academicYear: z.number().int().min(2020).max(2040),
  subject: z.string().min(1),
  grade: z.union([z.literal(10), z.literal(11), z.literal(12)]).optional(),
  selectedTopicIds: z.array(z.string()).max(40).optional().default([]),
  questionCount: z.number().int().min(1).max(40).optional(),
})

export const POST = withErrorHandler(async function POST(request: Request) {
  const user = await getAuthUser(request as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleCheck(user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request as any, user)
  if (!tenant.ok) return tenant.response

  const body = BodySchema.parse(await request.json().catch(() => null))

  try {
    const result = await routeGeneration({
      ...body,
      tenantId: String(tenant.schoolId),
    })
    return NextResponse.json({ success: true, result })
  } catch (err) {
    if (err instanceof MissingPastPaperError || (err as any)?.code === 'MISSING_PAST_PAPER') {
      return NextResponse.json(
        { error: (err as Error).message, code: 'MISSING_PAST_PAPER' },
        { status: 422 }
      )
    }
    throw err
  }
})
