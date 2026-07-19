export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'
import { withAILimits } from '@/lib/middleware/withAILimits'
import { generateTermReportForStudent } from '@/lib/ai/term-report-service'
import { authorizeAiRoute } from '@/lib/ai/routeAuth'

export const GET = withErrorHandler(async function GET(request) {
  const access = await authorizeAiRoute(request, {
    featureId: 'ai-term-reports',
    rateLimitPrefix: 'ai_term_reports_list_',
  })
  if (!access.ok) return access.response

  const { schoolId, user } = access

  const { searchParams } = new URL(request.url)
  const status = safeQueryString(searchParams.get('status'))
  const termRaw = safeQueryString(searchParams.get('term'))
  const term = termRaw ? Number(termRaw) : undefined

  const where = {
    schoolId,
    ...(status ? { status } : {}),
    ...(term != null && Number.isFinite(term) ? { term } : {}),
  }

  if (roleCheck(user, ['student', 'STUDENT'])) {
    const student = await prisma.student.findFirst({
      where: { userId: user.id, schoolId },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ success: true, data: [] })
    where.studentId = student.id
    where.status = 'PUBLISHED'
  }

  const rows = await prisma.termReport.findMany({
    where: { schoolId, ...where },
    include: { student: { select: { name: true, class: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ success: true, data: rows })
})

export const POST = withAILimits(
  withErrorHandler(async function POST(request) {
    const access = await authorizeAiRoute(request, {
      roles: ['hod', 'HOD', 'headteacher', 'ADMIN'],
      featureId: 'ai-term-reports',
      rateLimitPrefix: 'ai_term_reports_gen_',
    })
    if (!access.ok) return access.response

    const { schoolId, user } = access
    const body = await request.json().catch(() => ({}))
    const studentId = safeStringId(body.studentId)
    const term = Number(body.term) || 1
    const academicYear = Number(body.academicYear) || new Date().getFullYear()

    if (!studentId) throw new ApiError('studentId required', 400)

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    })
    if (!student) throw new ApiError('Student not found in this school', 404)

    const report = await generateTermReportForStudent({
      schoolId,
      studentId,
      term,
      academicYear,
      generatedById: user.id,
    })

    return NextResponse.json({ success: true, data: report })
  })
)
